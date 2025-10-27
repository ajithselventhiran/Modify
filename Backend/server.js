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

//  Test Database Connection
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


// Health Testing
app.get("/api/health", (_req, res) => res.json({ ok: true }));



// ---------------------- JWT Config ----------------------
const JWT_SECRET = process.env.JWT_SECRET || "supersecret123";
const JWT_EXPIRES = "2d";

// Middleware for Auth
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
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: fromEmail,
        pass: fromPass,
      },
    });

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

async function getAdminEmail(username) {
  const [rows] = await pool.query(
    "SELECT email, mail_pass FROM users WHERE username=? AND role='ADMIN' LIMIT 1",
    [username]
  );
  return rows[0] || null;
}


// ======================================================
// User — Create Ticket (Multiple Admins Supported)
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

    const sys_ip =
      ip_address ||
      (req.headers["x-forwarded-for"] || req.ip || "")
        .toString()
        .split(",")[0]
        .trim();

    // ✅ Handle multiple admins — insert one ticket for each selected admin
    const admins = Array.isArray(reporting_to) ? reporting_to : [reporting_to];

    for (const admin of admins) {
      await pool.query(
        `INSERT INTO tickets
         (emp_id, username, full_name, department, reporting_to, system_ip, issue_text, remarks, status)
         VALUES (?,?,?,?,?,?,?,?, 'NOT_ASSIGNED')`,
        [
          emp_id,
          username,
          full_name,
          department,
          admin,
          sys_ip,
          issue_text,
          remarks || null,
        ]
      );
    }

    res.json({ ok: true, message: "Ticket created successfully for all selected admins" });
  } catch (e) {
    console.error("❌ Ticket creation error:", e);
    res.status(500).json({ message: "Failed to create ticket" });
  }
});




// ======================================================
// User FIND (For InputForm.jsx)
// ======================================================
app.get("/api/employees/find", async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ message: "key required" });

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
// LOGIN (Admin + Technician )
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

    if (user.role === "USER")
      return res.status(403).json({ error: "User login not allowed" });
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
//  ADMIN ROUTES
// ======================================================

// Get Tickets
app.get("/api/admin/tickets", auth, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Access denied" });

    const admin = req.user.display_name;
    const { status } = req.query;

    const params = [admin];
    let sql = `
      SELECT id, emp_id, username, full_name, department, reporting_to,
             assigned_to, system_ip, issue_text, remarks, status, priority,
             start_date, end_date, created_at, updated_at
      FROM tickets
      WHERE reporting_to=?`;

    if (status && status !== "ALL") {
      sql += " AND status=?";
      params.push(status);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error("❌ Admin tickets error:", e);
    res.status(500).json({ error: "Failed to load tickets" });
  }
});

// ======================================================
// 🔹 ADMIN — Ticket Counts by Status (Dashboard cards)
// ======================================================
app.get("/api/admin/tickets/counts", auth, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Access denied" });

    // Manager name query-ல இருந்தா அதைய use பண்ணு
    const manager = req.query.manager || req.user.display_name;

    // DB-ல அந்த managerக்கு எத்தனை status இருக்குன்னு count பண்ணுது
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) AS count 
       FROM tickets 
       WHERE reporting_to = ?
       GROUP BY status`,
      [manager]
    );

    // result → object format-ஆ convert பண்ணுது
    const counts = {};
    rows.forEach((r) => (counts[r.status] = r.count));

    res.json(counts);
  } catch (e) {
    console.error("❌ Admin counts error:", e);
    res.status(500).json({ error: "Failed to load counts" });
  }
});



////
// ======================================================
// 🔹 Admin list API (Frontend dropdown-க்கு)
// ======================================================
app.get("/api/admins", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT full_name FROM users WHERE role='ADMIN'"
    );
    res.json(rows.map((r) => r.full_name));
  } catch (err) {
    console.error("❌ Error fetching admins:", err.message);
    res.status(500).json({ message: "Server error fetching admin list" });
  }
});




// ======================================================
//  ADMIN — Technician List
// ======================================================
app.get("/api/admin/technicians", auth, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Access denied" });

    //  Fetch all users with TECHNICIAN role
    const [rows] = await pool.query(
      "SELECT username, full_name, email FROM users WHERE role='TECHNICIAN' ORDER BY full_name ASC"
    );

    res.json(rows);
  } catch (e) {
    console.error("❌ Technician list failed:", e);
    res.status(500).json({ error: "Failed to load technicians" });
  }
});



//  Admin Assign Ticket → send email to technician (NodeMailer)
app.patch("/api/admin/tickets/:id/assign", auth, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Access denied" });

    const { id } = req.params;
    const { assigned_to, start_date, end_date, priority, remarks } = req.body;

    if (!assigned_to)
      return res.status(400).json({ error: "assigned_to required" });

    // Update ticket
    await pool.query(
      `UPDATE tickets 
       SET assigned_to=?, start_date=?, end_date=?, priority=?, remarks=?, status='ASSIGNED'
       WHERE id=?`,
      [assigned_to, start_date || null, end_date || null, priority || null, remarks || null, id]
    );

    // Get technician and admin details
    const [techRows] = await pool.query(
      "SELECT email FROM users WHERE full_name=? OR username=? LIMIT 1",
      [assigned_to, assigned_to]
    );
    const [adminRows] = await pool.query(
      "SELECT email, mail_pass FROM users WHERE username=? LIMIT 1",
      [req.user.username]
    );
    const tech = techRows[0];
    const admin = adminRows[0];
    const t = await getTicketWithEmployeeEmail(id);

    if (tech?.email && admin?.email && admin?.mail_pass) {
      await safeSendMail(
        {
          from: admin.email,
          to: tech.email,
          subject: "Ticket Assigned by Admin",
          html: `
            <p>Dear ${assigned_to},</p>
            <p>A new issue has been assigned by <strong>${req.user.display_name}</strong>.</p>
            <p><strong>User:</strong> ${t.full_name}<br/>
            <strong>Issue:</strong> ${t.issue_text}<br/>
            <strong>Start:</strong> ${start_date || "-"} <br/>
            <strong>End:</strong> ${end_date || "-"}</p>
            <p>— Rapid Ticketing System</p>
          `,
        },
        admin.email,
        admin.mail_pass
      );
    }

    res.json({ ok: true, message: "Ticket assigned and mail sent successfully" });
  } catch (e) {
    console.error("❌ Admin assign error:", e);
    res.status(500).json({ error: "Assign failed" });
  }
});






// ======================================================
//  TECHNICIAN ROUTES
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

// 🔹 Technician Status Update (Complete with Note)
app.patch("/api/technician/tickets/:id/status", auth, async (req, res) => {
  try {
    if (req.user.role !== "TECHNICIAN")
      return res.status(403).json({ error: "Access denied" });

    const { id } = req.params;
    const { status, fixed_note } = req.body;
    const valid = ["NOT_STARTED", "INPROCESS", "COMPLETE"];
    if (!valid.includes(status))
      return res.status(400).json({ error: "Invalid status" });

    // Update ticket
    if (status === "COMPLETE")
      await pool.query("UPDATE tickets SET status=?, fixed_note=? WHERE id=?", [status, fixed_note, id]);
    else
      await pool.query("UPDATE tickets SET status=? WHERE id=?", [status, id]);

    // Get ticket + technician info
    const t = await getTicketWithEmployeeEmail(id);
    const [techRows] = await pool.query(
      "SELECT email, mail_pass FROM users WHERE username=? LIMIT 1",
      [req.user.username]
    );
    const tech = techRows[0];

    if (!tech?.email || !tech?.mail_pass)
      return res.status(400).json({ error: "Technician mail info missing" });

    if (status === "INPROCESS" && t?.employee_email) {
      await safeSendMail(
        {
          from: tech.email,
          to: t.employee_email,
          subject: "Issue Taken Over",
          html: `
            <p>Dear ${t.full_name},</p>
            <p>Your issue has been taken over by <strong>${req.user.display_name}</strong>.</p>
            <p>— Rapid Ticketing System</p>
          `,
        },
        tech.email,
        tech.mail_pass
      );
    }

    if (status === "COMPLETE" && t?.employee_email) {
      await safeSendMail(
        {
          from: tech.email,
          to: t.employee_email,
          subject: `Issue Fixed by ${req.user.display_name}`,
          html: `
            <p>Dear ${t.full_name},</p>
            <p>Your issue "${t.issue_text}" marked as <strong>COMPLETE</strong>.</p>
            <p><strong>Technician Note:</strong><br/>${fixed_note || "No remarks provided."}</p>
            <p>— From: ${req.user.display_name}</p>
          `,
        },
        tech.email,
        tech.mail_pass
      );
    }

    res.json({ ok: true, message: "Status updated and mail sent" });
  } catch (e) {
    console.error("❌ Technician status update error:", e);
    res.status(500).json({ error: "Failed to update status" });
  }
});



// 🔹 Technician Reject Ticket → sends email to Admin
app.patch("/api/technician/tickets/:id/reject", auth, async (req, res) => {
  try {
    if (req.user.role !== "TECHNICIAN")
      return res.status(403).json({ error: "Access denied" });

    const { id } = req.params;
    const { subject, message } = req.body;

    const [ticketRows] = await pool.query("SELECT * FROM tickets WHERE id=?", [id]);
    if (!ticketRows.length) return res.status(404).json({ error: "Ticket not found" });
    const t = ticketRows[0];

    await pool.query("UPDATE tickets SET status='REJECTED', fixed_note=? WHERE id=?", [message, id]);

    const [adminRows] = await pool.query(
      "SELECT email FROM users WHERE full_name=? AND role='ADMIN' LIMIT 1",
      [t.reporting_to]
    );
    const [techRows] = await pool.query(
      "SELECT email, mail_pass FROM users WHERE username=? LIMIT 1",
      [req.user.username]
    );
    const admin = adminRows[0];
    const tech = techRows[0];

    if (admin?.email && tech?.email && tech?.mail_pass) {
      await safeSendMail(
        {
          from: tech.email,
          to: admin.email,
          subject: subject || `Ticket Rejected by ${req.user.display_name}`,
          html: `
            <p>Dear ${t.reporting_to},</p>
            <p>Technician <strong>${req.user.display_name}</strong> rejected ticket:</p>
            <p><strong>User:</strong> ${t.full_name}<br/>
            <strong>Issue:</strong> ${t.issue_text}</p>
            <p><strong>Reason:</strong><br/>${message || "(No message provided)"}</p>
            <p>— Rapid Ticketing System</p>
          `,
        },
        tech.email,
        tech.mail_pass
      );
    }

    res.json({ ok: true, message: "Ticket rejected and mail sent" });
  } catch (e) {
    console.error("❌ Technician reject error:", e);
    res.status(500).json({ error: "Reject process failed" });
  }
});






// ======================================================
// Start Server
// ======================================================
const port = Number(process.env.PORT || 5000);
app.listen(port, () =>
  console.log(`🚀 API running on http://localhost:${port}`)
);
