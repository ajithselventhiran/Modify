import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const API = "http://localhost:5000";

export default function TechnicianDashboard() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [techName, setTechName] = useState("");

  // 🔹 Load Technician Info from LocalStorage
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setTechName(userData?.display_name || userData?.username || "Technician");
  }, []);

  // 🔹 Load Tickets Assigned to Technician
  const loadTickets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const q = new URLSearchParams();
      if (filter !== "ALL") q.set("status", filter);

      const res = await fetch(
        `${API}/api/technician/my-tickets?${q.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
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
    loadTickets();
  }, [filter]);

  // 🔹 Update Ticket Status (ASSIGNED → PENDING → INPROCESS → COMPLETE)
  const updateStatus = async (id, newStatus) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/api/technician/tickets/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await loadTickets();
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

  // 🔹 Status Badge Color
  const getStatusBadge = (status) => {
    const map = {
      ASSIGNED: "bg-warning text-dark",
      PENDING: "bg-info text-dark",
      INPROCESS: "bg-primary",
      COMPLETE: "bg-success",
    };
    return map[status?.toUpperCase()] || "bg-secondary";
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h3 className="m-0 text-success fw-bold">
          Technician Dashboard — {techName}
        </h3>

        {/* Filter Buttons */}
        <div className="d-flex gap-2 flex-wrap">
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

      {/* Tickets Table */}
      <div className="table-responsive">
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
                  No tickets found.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id}>
                  <td>{t.reporting_to || "—"}</td>
                  <td style={{ maxWidth: 320 }}>
                    <div className="text-truncate">{t.issue_text}</div>
                  </td>
                  <td>
                    {t.start_date
                      ? new Date(t.start_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    {t.end_date
                      ? new Date(t.end_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                  <td>{t.remarks || "-"}</td>
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
                        className="btn btn-sm btn-outline-success me-1"
                        onClick={() => updateStatus(t.id, "COMPLETE")}
                      >
                        Complete
                      </button>
                    )}

                    {t.status === "COMPLETE" && (
                      <span className="badge bg-success">Completed</span>
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
