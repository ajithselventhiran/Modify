// ---------------------- Imports ----------------------
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

// ---------------------- App setup ----------------------
const app = express();
app.use(cors());
app.use(express.json());
app.set("trust proxy", true);

// ---------------------- MySQL Connection ----------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "rapid_ticket_db",
  connectionLimit: 10,
});

// ✅ Test Database Connection
(async () => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT DATABASE() AS db;");
    console.log("✅ MySQL Connected →", rows[0].db);
    conn.release();
  } catch (err) {
    console.error("❌ MySQL Connection Failed:", err.message);
    process.exit(1);
  }
})();

// ---------------------- JWT Config ----------------------
const JWT_SECRET = process.env.JWT_SECRET || "supersecret123";
const JWT_EXPIRES = "2d";

// 🔒 Middleware for Auth
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token" });
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: "Invalid or expired token" });
  }
}

// ======================================================
// 🌐 GENERAL ROUTES
// ======================================================

// 🔹 Health Check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// 🔹 Get Public IP
app.get("/api/ip", (req, res) => {
  const ip = (req.headers["x-forwarded-for"] || req.ip || "")
    .toString()
    .split(",")[0]
    .trim();
  res.json({ ip });
});

// 🔹 Find Employee
app.get("/api/employees/find", async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ message: "key required" });

    const [rows] = await pool.query(
      "SELECT * FROM employees WHERE emp_id = ? OR username = ? LIMIT 1",
      [key, key]
    );
    if (!rows.length) return res.status(404).json({ message: "Not found" });

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// ======================================================
// 👤 LOGIN (Plain Password)
// ======================================================
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username & password required" });

  try {
    const [rows] = await pool.query(
      "SELECT * FROM users_login WHERE username = ?",
      [username]
    );

    if (!rows.length)
      return res.status(401).json({ error: "Invalid username" });

    const user = rows[0];

    if (password !== user.password)
      return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        display_name: user.display_name,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      ok: true,
      token,
      user: {
        username: user.username,
        role: user.role,
        display_name: user.display_name,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed" });
  }
});

// ======================================================
// 🧾 STAFF — Create Ticket
// ======================================================
app.post("/api/tickets", async (req, res) => {
  try {
    let {
      emp_id,
      username,
      full_name,
      department,
      reporting_to,
      issue_text,
      remarks,
      ip_address,
    } = req.body;

    if (
      !emp_id ||
      !username ||
      !full_name ||
      !department ||
      !reporting_to ||
      !issue_text
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (Array.isArray(reporting_to)) reporting_to = reporting_to[0];
    const sys_ip =
      ip_address ||
      (req.headers["x-forwarded-for"] || req.ip || "")
        .toString()
        .split(",")[0]
        .trim();

    await pool.query(
      `INSERT INTO tickets
       (emp_id, username, full_name, department, reporting_to, system_ip, issue_text, remarks, status)
       VALUES (?,?,?,?,?,?,?,?, 'NOT_ASSIGNED')`,
      [
        emp_id,
        username,
        full_name,
        department,
        reporting_to,
        sys_ip,
        issue_text,
        remarks || null,
      ]
    );

    res.json({ ok: true, message: "Ticket created successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to create ticket" });
  }
});

// ======================================================
// 👨‍💼 MANAGER ROUTES
// ======================================================

// 🔹 Manager: Get Tickets
app.get("/api/manager/tickets", auth, async (req, res) => {
  try {
    if (req.user.role !== "MANAGER")
      return res.status(403).json({ error: "Access denied" });

    const manager = req.user.display_name;
    const { status } = req.query;

    const params = [manager];
    let sql = "SELECT * FROM tickets WHERE reporting_to = ?";
    if (status && status !== "ALL") {
      sql += " AND status = ?";
      params.push(status);
    }
    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load tickets" });
  }
});

// 🔹 Manager: Assign Ticket
app.patch("/api/manager/tickets/:id/assign", auth, async (req, res) => {
  try {
    if (req.user.role !== "MANAGER")
      return res.status(403).json({ error: "Access denied" });

    const { id } = req.params;
    const { assigned_to, start_date, end_date, priority, remarks } = req.body;

    if (!assigned_to)
      return res.status(400).json({ error: "assigned_to required" });

    await pool.query(
      `UPDATE tickets 
       SET assigned_to=?, start_date=?, end_date=?, priority=?, remarks=?, status='ASSIGNED'
       WHERE id=?`,
      [
        assigned_to,
        start_date || null,
        end_date || null,
        priority || null,
        remarks || null,
        id,
      ]
    );

    res.json({ ok: true, message: "Ticket assigned successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Assign failed" });
  }
});

// 🔹 Manager: Get All Staff directly from users_login (real data)
app.get("/api/manager/staff", auth, async (req, res) => {
  try {
    if (req.user.role !== "MANAGER")
      return res.status(403).json({ error: "Access denied" });

    // ✅ Get both username and display_name
    const [rows] = await pool.query(
      "SELECT username, display_name FROM users_login WHERE role = 'STAFF'"
    );

    // ✅ Return both for frontend clarity
    const staffList = rows.map((r) => ({
      username: r.username,
      name: r.display_name,
    }));

    res.json(staffList);
  } catch (e) {
    console.error("❌ Failed to load staff:", e);
    res.status(500).json({ error: "Failed to load staff" });
  }
});


// 🔹 Manager: Ticket Counts
app.get("/api/manager/tickets/counts", auth, async (req, res) => {
  try {
    if (req.user.role !== "MANAGER")
      return res.status(403).json({ error: "Access denied" });

    const manager = req.query.manager || req.user.display_name;
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) AS cnt
       FROM tickets
       WHERE reporting_to = ?
       GROUP BY status`,
      [manager]
    );

    const counts = {
      NOT_ASSIGNED: 0,
      ASSIGNED: 0,
      PENDING: 0,
      INPROCESS: 0,
      COMPLETE: 0,
      FIXED: 0,
    };
    rows.forEach((r) => (counts[r.status] = r.cnt));
    res.json(counts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load counts" });
  }
});

// ======================================================
// 👷 STAFF ROUTES
// ======================================================

// 🔹 Staff: View My Tickets
app.get("/api/staff/my-tickets", auth, async (req, res) => {
  try {
    if (req.user.role !== "STAFF")
      return res.status(403).json({ error: "Access denied" });

    const staff = req.user.display_name;
    const { status } = req.query;
    const params = [staff];
    let sql = "SELECT * FROM tickets WHERE assigned_to = ?";
    if (status && status !== "ALL") {
      sql += " AND status = ?";
      params.push(status);
    }
    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load staff tickets" });
  }
});

// 🔹 Staff: Update Ticket Status
app.patch("/api/staff/tickets/:id/status", auth, async (req, res) => {
  try {
    if (req.user.role !== "STAFF")
      return res.status(403).json({ error: "Access denied" });

    const { id } = req.params;
    const { status } = req.body;

    const valid = ["PENDING", "INPROCESS", "COMPLETE"];
    if (!valid.includes(status))
      return res.status(400).json({ error: "Invalid status" });

    await pool.query("UPDATE tickets SET status=? WHERE id=?", [status, id]);
    res.json({ ok: true, message: "Status updated successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// 🔹 Staff: Mark as Fixed
app.patch("/api/staff/tickets/:id/fix", auth, async (req, res) => {
  try {
    if (req.user.role !== "STAFF")
      return res.status(403).json({ error: "Access denied" });

    const { id } = req.params;
    const { remark } = req.body;

    if (remark && remark.trim()) {
      await pool.query(
        "UPDATE tickets SET remarks = CONCAT(COALESCE(remarks,''), '\\n[FIX NOTE] ', ?) WHERE id = ?",
        [remark.trim(), id]
      );
    }

    await pool.query("UPDATE tickets SET status='FIXED' WHERE id=?", [id]);
    res.json({ ok: true, message: "Ticket marked as fixed" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to mark fixed" });
  }
});

// ======================================================
// 🚀 Start Server
// ======================================================
const port = Number(process.env.PORT || 5000);
app.listen(port, () =>
  console.log(`🚀 API running on http://localhost:${port}`)
);
