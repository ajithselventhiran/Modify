import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const API = "http://localhost:5000";

export default function TechnicianDashboard() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [techName, setTechName] = useState("");
  const [counts, setCounts] = useState({
    ALL: 0,
    ASSIGNED: 0,
    NOT_STARTED: 0,
    INPROCESS: 0,
    COMPLETE: 0,
  });

  // 🔹 New States for Modals
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");

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

      const res = await fetch(`${API}/api/technician/my-tickets?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load tickets");
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
      calculateCounts(data);
    } catch (err) {
      console.error("❌ Ticket load failed:", err);
      setTickets([]);
      setCounts({ ALL: 0, ASSIGNED: 0, NOT_STARTED: 0, INPROCESS: 0, COMPLETE: 0 });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Calculate Ticket Counts Locally
  const calculateCounts = (data) => {
    const grouped = data.reduce(
      (acc, t) => {
        acc.ALL += 1;
        const s = (t.status || "").toUpperCase();
        if (acc[s] !== undefined) acc[s] += 1;
        return acc;
      },
      { ALL: 0, ASSIGNED: 0, NOT_STARTED: 0, INPROCESS: 0, COMPLETE: 0 }
    );
    setCounts(grouped);
  };

  useEffect(() => {
    loadTickets();
  }, [filter]);

  // 🔹 Update Ticket Status
  const updateStatus = async (id, newStatus, fixed_note = "") => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/api/technician/tickets/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, fixed_note }),
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

  // 🔹 Technician Reject Ticket
  const rejectTicket = async (id, subject, message) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/api/technician/tickets/${id}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ Ticket rejected and email sent to Admin");
        await loadTickets();
      } else {
        alert(data.error || "❌ Reject failed");
      }
    } catch (e) {
      alert("Server error during reject");
    }
  };

  // 🔹 Status Badge Colors
  const getStatusBadge = (status) => {
    const map = {
      ASSIGNED: "bg-warning text-dark",
      NOT_STARTED: "bg-info text-dark",
      INPROCESS: "bg-primary",
      COMPLETE: "bg-success",
      REJECTED: "bg-danger",
    };
    return map[status?.toUpperCase()] || "bg-secondary";
  };

  const statusOrder = ["ALL", "ASSIGNED", "NOT_STARTED", "INPROCESS", "COMPLETE"];

  return (
    <div
      className="container-fluid py-4"
      style={{
        background: "linear-gradient(135deg, #f5f8ff, #e9ecef)",
        minHeight: "100vh",
      }}
    >
      {/* HEADER */}
      <div
        className="p-4 mb-4 rounded-4 text-white shadow-sm"
        style={{
          background: "linear-gradient(90deg, #28a745, #20c997)",
        }}
      >
        <div className="d-flex justify-content-between align-items-center flex-wrap">
          <h3 className="fw-bold mb-0">
            Technician Dashboard — {techName}
          </h3>
          <small>{new Date().toLocaleString("en-IN")}</small>
        </div>
      </div>

      {/* STATUS CARDS ROW */}
      <div className="d-flex flex-wrap justify-content-center gap-3 mb-3">
        {statusOrder.map((key) => (
          <div
            key={key}
            className={`text-center text-white p-3 shadow-sm ${getStatusBadge(
              key
            )}`}
            style={{
              borderRadius: "12px",
              width: "15%",
              minWidth: "120px",
              transition: "transform 0.3s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <h6 className="fw-semibold text-uppercase small mb-1">
              {key.replace("_", " ")}
            </h6>
            <h3 className="fw-bold mb-0">{counts[key] || 0}</h3>
          </div>
        ))}
      </div>

      {/* BUTTON ROW */}
      <div className="d-flex flex-wrap justify-content-center gap-3 mb-5">
        {statusOrder.map((s) => (
          <div
            key={s}
            className="text-center"
            style={{
              width: "15%",
              minWidth: "120px",
            }}
          >
            <button
              className={`btn btn-sm w-100 fw-semibold ${
                filter === s ? "btn-success" : "btn-outline-success"
              }`}
              onClick={() => setFilter(s)}
            >
              {s} ({counts[s] || 0})
            </button>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="card border-0 shadow-lg rounded-4">
        <div
          className="card-header text-white rounded-top-4"
          style={{
            background: "linear-gradient(90deg, #198754, #20c997)",
          }}
        >
          <h5 className="mb-0 fw-semibold">My Assigned Tickets</h5>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-success text-center">
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
                    <td colSpan="7" className="text-center py-3 text-muted">
                      Loading…
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-3 text-muted">
                      No tickets found.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t.id} className="text-center">
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
                        <span
                          className={`badge ${getStatusBadge(t.status)} px-3 py-2`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td>{t.remarks || "-"}</td>
                      <td>
                        {/* ACTION BUTTONS */}
                        {t.status === "ASSIGNED" && (
                          <button
                            className="btn btn-sm btn-outline-info me-1"
                            onClick={() => updateStatus(t.id, "NOT_STARTED")}
                          >
                            Not Started
                          </button>
                        )}
                        {t.status === "NOT_STARTED" && (
                          <button
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => updateStatus(t.id, "INPROCESS")}
                          >
                            In Process
                          </button>
                        )}
                        {t.status === "INPROCESS" && (
                          <>
                            <button
                              className="btn btn-sm btn-outline-success me-1"
                              onClick={() => {
                                setCurrentTicket(t);
                                setShowCompleteModal(true);
                              }}
                            >
                              Complete
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => {
                                setCurrentTicket(t);
                                setShowRejectModal(true);
                              }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ✅ Complete Modal */}
      {showCompleteModal && (
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Add Completion Note</h5>
                <button className="btn-close" onClick={() => setShowCompleteModal(false)}></button>
              </div>
              <div className="modal-body">
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Enter your fix note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                ></textarea>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCompleteModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-success"
                  onClick={async () => {
                    await updateStatus(currentTicket.id, "COMPLETE", note);
                    setNote("");
                    setShowCompleteModal(false);
                  }}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚫 Reject Modal */}
      {showRejectModal && (
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Reject Ticket</h5>
                <button className="btn-close" onClick={() => setShowRejectModal(false)}></button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Enter rejection reason..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                ></textarea>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={async () => {
                    await rejectTicket(currentTicket.id, subject, message);
                    setSubject("");
                    setMessage("");
                    setShowRejectModal(false);
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
