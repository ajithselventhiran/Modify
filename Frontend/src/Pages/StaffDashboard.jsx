import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const API = "http://localhost:5000";

export default function StaffDashboard() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [staffName, setStaffName] = useState("");

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setStaffName(userData?.display_name || userData?.username || "Staff");
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const q = new URLSearchParams();
      if (filter !== "ALL") q.set("status", filter);

      const res = await fetch(`${API}/api/staff/my-tickets?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load tickets");
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Ticket load failed:", err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  // 🔹 Update ticket status (Pending → Inprocess → Complete)
  const updateStatus = async (id, newStatus) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/api/staff/tickets/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await load();
        alert(`✅ Ticket status updated to ${newStatus}`);
      } else {
        const data = await res.json();
        alert(data?.error || "❌ Status update failed");
      }
    } catch (e) {
      console.error(e);
      alert("Server error while updating status");
    }
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="m-0 text-success fw-bold">
          Staff Dashboard — {staffName}
        </h3>

        <div className="d-flex gap-2">
          {["ALL", "ASSIGNED", "PENDING", "INPROCESS", "COMPLETE"].map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${
                filter === s ? "btn-success" : "btn-outline-success"
              }`}
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive shadow-sm">
        <table className="table table-hover align-middle">
          <thead className="table-success">
            <tr>
              <th>Assigned By (Manager)</th>
              <th>Issue</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Remarks</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center text-muted py-3">
                  Loading…
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center text-muted py-3">
                  No tickets found
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id}>
                  {/* Assigned By */}
                  <td>{t.reporting_to || "—"}</td>

                  {/* Issue */}
                  <td style={{ maxWidth: 320 }}>
                    <div className="text-truncate">{t.issue_text}</div>
                  </td>

                  {/* Start Date */}
                  <td>{t.start_date ? new Date(t.start_date).toLocaleDateString() : "—"}</td>

                  {/* End Date */}
                  <td>{t.end_date ? new Date(t.end_date).toLocaleDateString() : "—"}</td>

                  {/* Status */}
                  <td>
                    <span
                      className={`badge ${
                        t.status === "ASSIGNED"
                          ? "bg-warning text-dark"
                          : t.status === "PENDING"
                          ? "bg-info text-dark"
                          : t.status === "INPROCESS"
                          ? "bg-primary"
                          : t.status === "COMPLETE"
                          ? "bg-success"
                          : "bg-secondary"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>

                  {/* Remarks */}
                  <td>{t.remarks || "-"}</td>

                  {/* Action buttons */}
                  <td>
                    {t.status === "ASSIGNED" && (
                      <button
                        className="btn btn-sm btn-outline-info me-1"
                        onClick={() => updateStatus(t.id, "PENDING")}
                      >
                        Pending
                      </button>
                    )}
                    {t.status === "PENDING" && (
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => updateStatus(t.id, "INPROCESS")}
                      >
                        In Process
                      </button>
                    )}
                    {t.status === "INPROCESS" && (
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => updateStatus(t.id, "COMPLETE")}
                      >
                        Complete
                      </button>
                    )}
                    {t.status === "COMPLETE" && (
                      <span className="badge bg-success">Done</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
