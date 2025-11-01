import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const API = "http://localhost:5000";

export default function TechnicianDashboard() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [dueFilter, setDueFilter] = useState("ALL_DUE");
  const [loading, setLoading] = useState(false);
  const [techName, setTechName] = useState("");
  const [allTickets, setAllTickets] = useState([]);

  const [counts, setCounts] = useState({
    ALL: 0,
    ASSIGNED: 0,
    NOT_STARTED: 0,
    INPROCESS: 0,
    COMPLETE: 0,
    REJECTED: 0,
  });

  // 🧩 Modals + form states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");

  const [mailLoading, setMailLoading] = useState(false);
  const [mailMessage, setMailMessage] = useState("Processing...");
  const [toast, setToast] = useState({ show: false, type: "", text: "" });

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false, type: "", text: "" }), 3000);
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setTechName(userData?.display_name || userData?.username || "Technician");
  }, []);
// 🧩 Load Tickets (Admin-style refresh, avoids unnecessary re-render)
const loadTickets = async (silent = false) => {
  if (!silent) setLoading(true);
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/api/technician/my-tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load tickets");
    const data = await res.json();
    const validData = Array.isArray(data) ? data : [];

    // 🕒 Add daysLeft info
    validData.forEach((t) => {
      if (t.end_date) {
        const end = new Date(t.end_date);
        const today = new Date();
        const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        if (diffDays > 0)
          t.daysLeft = `${diffDays} day${diffDays > 1 ? "s" : ""} left`;
        else if (diffDays === 0) t.daysLeft = "Due today";
        else
          t.daysLeft = `Overdue by ${Math.abs(diffDays)} day${
            Math.abs(diffDays) > 1 ? "s" : ""
          }`;
      } else t.daysLeft = "—";
    });

    // ✅ Compare with previous list before updating (avoid flicker)
    setAllTickets((prev) => {
      const prevKey = prev.map((t) => `${t.id}-${t.status}`).join(",");
      const newKey = validData.map((t) => `${t.id}-${t.status}`).join(",");
      if (prevKey === newKey) return prev; // no change → no update
      return validData;
    });

    calculateCounts(validData);
    applyFilter(validData, filter, dueFilter);
  } catch (err) {
    console.error("❌ Ticket load failed:", err);
    showToast("danger", "Failed to load tickets");
  } finally {
    if (!silent) setLoading(false);
  }
};

// 🧩 Apply Filter (Admin-style — skip update if no change)
const applyFilter = (data, selectedFilter, selectedDueFilter = dueFilter) => {
  let filtered = data;

  // Filter by status
  if (selectedFilter !== "ALL") {
    filtered = filtered.filter(
      (t) => (t.status || "").toUpperCase() === selectedFilter
    );
  }

  // Filter by due date type
  const today = new Date().setHours(0, 0, 0, 0);
  if (selectedDueFilter === "OVERDUE") {
    filtered = filtered.filter(
      (t) =>
        t.end_date &&
        new Date(t.end_date).setHours(0, 0, 0, 0) < today &&
        t.status !== "COMPLETE"
    );
  } else if (selectedDueFilter === "DUE_TODAY") {
    filtered = filtered.filter(
      (t) =>
        t.end_date &&
        new Date(t.end_date).setHours(0, 0, 0, 0) === today &&
        t.status !== "COMPLETE"
    );
  } else if (selectedDueFilter === "UPCOMING") {
    filtered = filtered.filter(
      (t) =>
        t.end_date &&
        new Date(t.end_date).setHours(0, 0, 0, 0) > today &&
        t.status !== "COMPLETE"
    );
  }

  // ✅ Update only if list actually changed
  setTickets((prev) => {
    const prevKey = prev.map((t) => `${t.id}-${t.status}`).join(",");
    const newKey = filtered.map((t) => `${t.id}-${t.status}`).join(",");
    if (prevKey === newKey) return prev; // avoid flicker
    return filtered;
  });
};


  const calculateCounts = (data) => {
    const grouped = data.reduce(
      (acc, t) => {
        acc.ALL += 1;
        const s = (t.status || "").toUpperCase();
        if (acc[s] !== undefined) acc[s] += 1;
        return acc;
      },
      {
        ALL: 0,
        ASSIGNED: 0,
        NOT_STARTED: 0,
        INPROCESS: 0,
        COMPLETE: 0,
        REJECTED: 0,
      }
    );
    setCounts(grouped);
  };

  useEffect(() => {
    applyFilter(allTickets, filter, dueFilter);
  }, [filter, dueFilter, allTickets]);

  // 🧩 Auto refresh
useEffect(() => {
  loadTickets(true);
  const interval = setInterval(() => {
    if (document.visibilityState === "visible") {
      loadTickets(true);
    }
  }, 5000);

  return () => clearInterval(interval);
}, [filter, dueFilter]);


  // 🧩 Update / Reject
  const updateStatus = async (id, newStatus, fixed_note = "") => {
    const token = localStorage.getItem("token");
    try {
      setMailLoading(true);
      setMailMessage(`Updating ticket to ${newStatus}...`);
      const res = await fetch(`${API}/api/technician/tickets/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, fixed_note }),
      });
      if (res.ok) {
        showToast("success", `Ticket updated to ${newStatus}`);
        await loadTickets();
      } else {
        const data = await res.json();
        showToast("danger", data?.error || "Status update failed");
      }
    } catch (e) {
      console.error(e);
      showToast("danger", "Server error while updating status");
    } finally {
      setMailLoading(false);
    }
  };

  const rejectTicket = async (id, subject, message) => {
    const token = localStorage.getItem("token");
    try {
      setMailLoading(true);
      setMailMessage("Rejecting ticket & sending mail...");
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
        showToast("success", "Ticket rejected and mail sent to Admin");
        await loadTickets();
      } else showToast("danger", data.error || "Reject failed");
    } catch (e) {
      showToast("danger", "Server error during reject");
    } finally {
      setMailLoading(false);
    }
  };

  // 🧩 UI helpers
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

  const statusOrder = [
    "ALL",
    "ASSIGNED",
    "NOT_STARTED",
    "INPROCESS",
    "COMPLETE",
    "REJECTED",
  ];

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
          <h3 className="fw-bold mb-0">Technician Dashboard — {techName}</h3>
          <small>{new Date().toLocaleString("en-IN")}</small>
        </div>
      </div>

      {/* STATUS CARDS */}
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
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.05)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <h6 className="fw-semibold text-uppercase small mb-1">
              {key.replace("_", " ")}
            </h6>
            <h3 className="fw-bold mb-0">{counts[key] || 0}</h3>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div className="d-flex flex-wrap justify-content-center gap-3 mb-3">
        {statusOrder.map((s) => (
          <button
            key={s}
            className={`btn btn-sm fw-semibold ${
              filter === s ? "btn-success" : "btn-outline-success"
            }`}
            onClick={() => setFilter(s)}
            style={{ minWidth: "120px" }}
          >
            {s} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {/* DUE DATE FILTERS */}
      <div className="d-flex flex-wrap justify-content-center gap-3 mb-4">
        {[
          { key: "ALL_DUE", label: "All" },
          { key: "OVERDUE", label: "Overdue" },
          { key: "DUE_TODAY", label: "Due Today" },
          { key: "UPCOMING", label: "Upcoming" },
        ].map((d) => (
          <button
            key={d.key}
            className={`btn btn-sm fw-semibold ${
              dueFilter === d.key ? "btn-success" : "btn-outline-success"
            }`}
            onClick={() => setDueFilter(d.key)}
            style={{ minWidth: "120px" }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="card border-0 shadow-lg rounded-4">
        <div
          className="card-header text-white rounded-top-4"
          style={{ background: "linear-gradient(90deg, #198754, #20c997)" }}
        >
          <h5 className="mb-0 fw-semibold">My Assigned Tickets</h5>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-success text-center">
                <tr>
                  <th>Assigned By</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Days Left</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Issue</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-3 text-muted">
                      Loading…
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-3 text-muted">
                      No tickets found.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr
                      key={t.id}
                      className={`text-center ${
                        t.end_date &&
                        new Date(t.end_date) < new Date() &&
                        t.status !== "COMPLETE"
                          ? "table-danger"
                          : ""
                      }`}
                    >
                      <td>{t.reporting_to || "—"}</td>
                      <td>
                        {t.start_date
                          ? new Date(t.start_date).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td>
                        {t.end_date
                          ? new Date(t.end_date).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td>
                        <span
                          className={`fw-semibold ${
                            t.daysLeft.includes("Overdue")
                              ? "text-danger"
                              : t.daysLeft.includes("left")
                              ? "text-success"
                              : "text-warning"
                          }`}
                        >
                          {t.daysLeft}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${getStatusBadge(
                            t.status
                          )} px-3 py-2`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td>{t.remarks || "-"}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            setCurrentTicket(t);
                            setShowDetailModal(true);
                          }}
                        >
                          View
                        </button>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-dark"
                          onClick={() => {
                            setCurrentTicket(t);
                            setShowActionModal(true);
                          }}
                        >
                          ⋯
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

  {/* ACTION MODAL */}
{showActionModal && currentTicket && (
  <div className="modal fade show d-block" tabIndex="-1">
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header bg-dark text-white">
          <h5 className="modal-title">
            Actions — Ticket {currentTicket.id}
          </h5>
          <button
            className="btn-close"
            onClick={() => setShowActionModal(false)}
          ></button>
        </div>

        <div className="modal-body d-flex flex-wrap gap-2 justify-content-center">
          {/* 🔹 Not Started */}
          {currentTicket.status === "ASSIGNED" ? (
            <button
              className="btn btn-info"
              onClick={() => {
                setShowActionModal(false);
                updateStatus(currentTicket.id, "NOT_STARTED");
              }}
            >
              Not Started
            </button>
          ) : (
            <button className="btn btn-outline-info" disabled>
              Not Started
            </button>
          )}

          {/* 🔹 In Process */}
          {currentTicket.status === "NOT_STARTED" ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowActionModal(false);
                updateStatus(currentTicket.id, "INPROCESS");
              }}
            >
              In Process
            </button>
          ) : (
            <button className="btn btn-outline-primary" disabled>
              In Process
            </button>
          )}

          {/* 🔹 Complete */}
          {currentTicket.status === "INPROCESS" ? (
            <button
              className="btn btn-success"
              onClick={() => {
                setShowActionModal(false);
                setShowCompleteModal(true);
              }}
            >
              Complete
            </button>
          ) : (
            <button className="btn btn-outline-success" disabled>
              Complete
            </button>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={() => setShowActionModal(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}


   {/* VIEW MODAL */}
{showDetailModal && currentTicket && (
  <div className="modal fade show d-block" tabIndex="-1">
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header bg-secondary text-white">
          <h5 className="modal-title">Ticket Details</h5>
          <button
            className="btn-close"
            onClick={() => setShowDetailModal(false)}
          ></button>
        </div>

        <div className="modal-body">
          <p><strong>Assigned By:</strong> {currentTicket.reporting_to}</p>
          <p><strong>Employee:</strong> {currentTicket.full_name}</p>
          <p><strong>Department:</strong> {currentTicket.department}</p>
          <p><strong>Issue:</strong> {currentTicket.issue_text}</p>
          <p><strong>Status:</strong> {currentTicket.status}</p>
        </div>

        {/* 🔹 Footer with Reject + Close */}
        <div className="modal-footer d-flex justify-content-between">
          <button
            className="btn btn-danger"
            disabled={["REJECTED", "COMPLETE"].includes(currentTicket.status)}
            onClick={() => {
              setShowDetailModal(false);
              setShowRejectModal(true);
            }}
          >
            Reject
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setShowDetailModal(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}


      {/* COMPLETE MODAL */}
      {showCompleteModal && (
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Add Completion Note</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowCompleteModal(false)}
                ></button>
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
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCompleteModal(false)}
                >
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

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Reject Ticket</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowRejectModal(false)}
                ></button>
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
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowRejectModal(false)}
                >
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

      {/* LOADER */}
      {mailLoading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center"
          style={{ background: "rgba(255,255,255,0.8)", zIndex: 2000 }}
        >
          <div
            className="spinner-border text-success mb-3"
            style={{ width: "3rem", height: "3rem" }}
            role="status"
          ></div>
          <p className="fw-semibold text-success">{mailMessage}</p>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div
          className={`toast align-items-center text-white bg-${toast.type} position-fixed top-0 end-0 m-3 show`}
          role="alert"
          style={{ zIndex: 3000, minWidth: "250px" }}
        >
          <div className="d-flex">
            <div className="toast-body fw-semibold">{toast.text}</div>
            <button
              type="button"
              className="btn-close btn-close-white me-2 m-auto"
              onClick={() => setToast({ show: false, type: "", text: "" })}
            ></button>
          </div>
        </div>
      )}
    </div>
  );
}
