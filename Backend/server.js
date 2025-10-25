// ======================================================
// 🔧 RAPID TICKETING BACKEND (Manager + Technician roles)
// ======================================================

import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

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
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// ---------------------- Default Mailer ----------------------
const defaultTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

defaultTransporter.verify().then(
  () => console.log("📧 Default Mailer ready"),
  (e) => console.warn("⚠️ Mailer not ready:", e?.message || e)
);

// ---------------------- Helper Functions ----------------------
async function safeSendMail(options, fromEmail, fromPass) {
  try {
    let transporter = defaultTransporter;

    if (fromEmail && fromPass) {
      transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user: fromEmail, pass: fromPass },
      });
    }

    await transporter.sendMail(options);
    console.log(`📨 Mail sent: ${options.subject}`);
  } catch (e) {
    console.error("❌ Email send failed:", e?.message || e);
  }
}

async function getTicketWithEmployeeEmail(id) {
  const [rows] = await pool.query(
    `SELECT t.*, u.email AS employee_email 
     FROM tickets t
     LEFT JOIN users u ON u.username = t.username
     WHERE t.id=? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function getManagerEmail(username) {
  const [rows] = await pool.query(
    "SELECT email, mail_pass FROM users WHERE username=? AND role='MANAGER' LIMIT 1",
    [username]
  );
  return rows[0] || null;
}

// ======================================================
// 🌐 GENERAL ROUTES
// ======================================================
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ======================================================
// 👤 LOGIN (Manager + Technician only)
// ======================================================
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username & password required" });

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE username=?", [
      username,
    ]);
    if (!rows.length) return res.status(401).json({ error: "Invalid user" });
    const user = rows[0];

    if (user.role === "EMPLOYEE")
      return res.status(403).json({ error: "Employee login not allowed" });
    if (user.password !== password)
      return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        display_name: user.full_name,
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
        display_name: user.full_name,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed" });
  }
});

// ======================================================
// 🧾 EMPLOYEE — Create Ticket
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
      (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();

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

// 🔹 Get Tickets
app.get("/api/manager/tickets", auth, async (req, res) => {
  try {
    if (req.user.role !== "MANAGER")
      return res.status(403).json({ error: "Access denied" });

    const manager = req.user.display_name;
    const { status } = req.query;

    const params = [manager];
    let sql = "SELECT * FROM tickets WHERE reporting_to=?";
    if (status && status !== "ALL") {
      sql += " AND status=?";
      params.push(status);
    }
    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: "Failed to load tickets" });
  }
});


// ======================================================
// 👤 EMPLOYEE FIND (For InputForm.jsx)
// ======================================================
app.get("/api/employees/find", async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ message: "key required" });

    // ✅ Use correct table name depending on your DB structure
    // If your employee data is in 'users' table → keep 'users'
    // If you have a separate 'employees' table → change to 'employees'

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE emp_id = ? OR username = ? LIMIT 1",
      [key, key]
    );

    if (!rows.length) return res.status(404).json({ message: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("❌ /api/employees/find error:", e);
    res.status(500).json({ message: "Server error" });
  }
});


// ======================================================
// 👨‍🔧 MANAGER — Technician List
// ======================================================
app.get("/api/manager/technicians", auth, async (req, res) => {
  try {
    if (req.user.role !== "MANAGER")
      return res.status(403).json({ error: "Access denied" });

    // 🔹 Fetch all users with TECHNICIAN role
    const [rows] = await pool.query(
      "SELECT username, full_name, email FROM users WHERE role='TECHNICIAN' ORDER BY full_name ASC"
    );

    res.json(rows);
  } catch (e) {
    console.error("❌ Technician list failed:", e);
    res.status(500).json({ error: "Failed to load technicians" });
  }
});



// 🔹 Assign Ticket → send email to technician only
app.patch("/api/manager/tickets/:id/assign", auth, async (req, res) => {
  try {
    if (req.user.role !== "MANAGER")
      return res.status(403).json({ error: "Access denied" });

    const { id } = req.params;
    const { assigned_to, start_date, end_date, priority, remarks } = req.body;
    if (!assigned_to)
      return res.status(400).json({ error: "assigned_to required" });

    await pool.query(
      `UPDATE tickets SET assigned_to=?, start_date=?, end_date=?, priority=?, remarks=?, status='ASSIGNED'
       WHERE id=?`,
      [assigned_to, start_date || null, end_date || null, priority || null, remarks || null, id]
    );

    // 🔹 Send mail only to Technician (not employee)
    const [tech] = await pool.query(
      "SELECT email FROM users WHERE full_name=? OR username=? LIMIT 1",
      [assigned_to, assigned_to]
    );
    const mgr = await getManagerEmail(req.user.username);
    const t = await getTicketWithEmployeeEmail(id);

    if (tech?.length && tech[0].email && mgr?.email) {
      await safeSendMail(
        {
          from: mgr.email,
          to: tech[0].email,
          subject: "Ticket Assigned by Manager",
          html: `
            <p>Dear ${assigned_to},</p>
            <p>A new issue has been assigned to you by <strong>${req.user.display_name}</strong>.</p>
            <p><strong>Employee:</strong> ${t.full_name}<br/>
            <strong>Issue:</strong> ${t.issue_text}<br/>
            <strong>Start:</strong> ${start_date || "-"} <br/>
            <strong>End:</strong> ${end_date || "-"}</p>
            <p>— Rapid Ticketing System</p>
          `,
        },
        mgr.email,
        mgr.mail_pass
      );
    }

    res.json({ ok: true, message: "Ticket assigned successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Assign failed" });
  }
});

// 🔹 Reject Ticket → email to employee + enable delete
app.patch("/api/manager/tickets/:id/reject", auth, async (req, res) => {
  try {
    if (req.user.role !== "MANAGER")
      return res.status(403).json({ error: "Access denied" });

    const { id } = req.params;
    await pool.query("UPDATE tickets SET status='REJECTED' WHERE id=?", [id]);

    const t = await getTicketWithEmployeeEmail(id);
    const mgr = await getManagerEmail(req.user.username);

    if (t?.employee_email && mgr?.email) {
      await safeSendMail(
        {
          from: mgr.email,
          to: t.employee_email,
          subject: "Rapid Ticketing",
          html: `
            <p>Dear ${t.full_name},</p>
            <p>Your submitted ticket (#${t.id}) is not valuable and has been <strong>REJECTED</strong>.</p>
            <p>— From: ${req.user.display_name}</p>
            <p>— Rapid Ticketing System</p>
          `,
        },
        mgr.email,
        mgr.mail_pass
      );
    }

    res.json({ ok: true, message: "Ticket rejected successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Reject failed" });
  }
});




// 🔹 Manager Delete Rejected Ticket
app.delete("/api/manager/tickets/:id/delete", auth, async (req, res) => {
  try {
    if (req.user.role !== "MANAGER")
      return res.status(403).json({ error: "Access denied" });

    const { id } = req.params;
    const [rows] = await pool.query("SELECT status FROM tickets WHERE id=?", [
      id,
    ]);
    if (!rows.length)
      return res.status(404).json({ error: "Ticket not found" });
    if (rows[0].status !== "REJECTED")
      return res
        .status(400)
        .json({ error: "Only rejected tickets can be deleted" });

    await pool.query("DELETE FROM tickets WHERE id=?", [id]);
    res.json({ ok: true, message: "Rejected ticket deleted successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Delete failed" });
  }
});

// ======================================================
// 👷 TECHNICIAN ROUTES
// ======================================================
app.get("/api/technician/my-tickets", auth, async (req, res) => {
  try {
    if (req.user.role !== "TECHNICIAN")
      return res.status(403).json({ error: "Access denied" });

    const tech = req.user.display_name;
    const { status } = req.query;

    const params = [tech];
    let sql = "SELECT * FROM tickets WHERE assigned_to=?";
    if (status && status !== "ALL") {
      sql += " AND status=?";
      params.push(status);
    }
    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: "Failed to load tickets" });
  }
});

// 🔹 Technician Status Update
app.patch("/api/technician/tickets/:id/status", auth, async (req, res) => {
  try {
    if (req.user.role !== "TECHNICIAN")
      return res.status(403).json({ error: "Access denied" });

    const { id } = req.params;
    const { status } = req.body;
    const valid = ["PENDING", "INPROCESS", "COMPLETE"];
    if (!valid.includes(status))
      return res.status(400).json({ error: "Invalid status" });

    await pool.query("UPDATE tickets SET status=? WHERE id=?", [status, id]);

    const t = await getTicketWithEmployeeEmail(id);

    // Email logic:
    if (status === "INPROCESS" && t?.employee_email) {
      await safeSendMail(
        {
          from: process.env.SMTP_USER,
          to: t.employee_email,
          subject: "Issue Taken Over",
          html: `
            <p>Dear ${t.full_name},</p>
            <p>Your issue has been taken over by technician <strong>${req.user.display_name}</strong>.</p>
            <p>— Rapid Ticketing System</p>
          `,
        },
        null,
        null
      );
    }

    if (status === "COMPLETE" && t?.employee_email) {
      await safeSendMail(
        {
          from: process.env.SMTP_USER,
          to: t.employee_email,
          subject: "Issue Fixed",
          html: `
            <p>Dear ${t.full_name},</p>
            <p>Your issue (Ticket #${t.id}) has been fixed by technician <strong>${req.user.display_name}</strong>.</p>
            <p>— Rapid Ticketing System</p>
          `,
        },
        null,
        null
      );
    }

    res.json({ ok: true, message: "Status updated successfully" });
  } catch (e) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ======================================================
// 🚀 Start Server
// ======================================================
const port = Number(process.env.PORT || 5000);
app.listen(port, () =>
  console.log(`🚀 API running on http://localhost:${port}`)
);
