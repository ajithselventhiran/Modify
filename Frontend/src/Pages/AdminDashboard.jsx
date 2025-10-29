import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const API = "http://localhost:5000"; // 🔗 Backend API

export default function AdminDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const managerName = user.display_name || "Admin";

  const [tickets, setTickets] = useState([]);
  const [technicianList, setTechnicianList] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({
    ALL: 0,
    NOT_ASSIGNED: 0,
    ASSIGNED: 0,
    PENDING: 0,
    INPROCESS: 0,
    COMPLETE: 0,
    REJECTED: 0,
  });

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState("");
  const [remarks, setRemarks] = useState("");

  // Mail / process loading
  const [mailLoading, setMailLoading] = useState(false);
  const [mailMessage, setMailMessage] = useState("Processing...");
  const [toast, setToast] = useState({ show: false, type: "", text: "" });
  const [showSuccessIcon, setShowSuccessIcon] = useState(false);

  const token = localStorage.getItem("token");

  // ✅ Play sound
// ✅ Improved version - ensures browser plays the sound reliably
const playSuccessSound = () => {
  const audio = new Audio(
    "https://cdn.pixabay.com/audio/2022/03/15/audio_68c4f708a0.mp3"
  );
  audio.volume = 0.4;

  // try to play immediately
  const playPromise = audio.play();

  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        console.log("🎵 Success sound played");
      })
      .catch((err) => {
        console.warn("🔇 Autoplay blocked, retrying on user gesture…");
        // wait for next user click to replay
        const tryAgain = () => {
          audio.play().catch(() => {});
          document.removeEventListener("click", tryAgain);
        };
        document.addEventListener("click", tryAgain);
      });
  }
};


  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    if (type === "success") {
      playSuccessSound();
      setShowSuccessIcon(true);
      setTimeout(() => setShowSuccessIcon(false), 1500);
    }
    setTimeout(() => setToast({ show: false, type: "", text: "" }), 3000);
  };

  // ✅ Smart auto-refresh loader
  const loadTickets = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const q = new URLSearchParams({ manager: managerName });
      if (filter !== "ALL") q.set("status", filter);
      const res = await fetch(`${API}/api/admin/tickets?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      setTickets((prev) => {
        const prevKey = prev.map((t) => `${t.id}-${t.status}`).join(",");
        const newKey = (data || []).map((t) => `${t.id}-${t.status}`).join(",");
        if (prevKey === newKey) return prev;
        return Array.isArray(data) ? data : [];
      });
    } catch (err) {
      console.error("❌ Load tickets failed:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Load Technicians
  const loadTechnicians = async () => {
    try {
      const res = await fetch(`${API}/api/admin/technicians`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTechnicianList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Load technicians failed:", err);
    }
  };

  // Load Counts
  const loadCounts = async () => {
    try {
      const res = await fetch(`${API}/api/admin/tickets/counts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const total =
        (data?.NOT_ASSIGNED || 0) +
        (data?.ASSIGNED || 0) +
        (data?.PENDING || 0) +
        (data?.INPROCESS || 0) +
        (data?.COMPLETE || 0) +
        (data?.REJECTED || 0);

      setCounts({
        ALL: total,
        NOT_ASSIGNED: data?.NOT_ASSIGNED || 0,
        ASSIGNED: data?.ASSIGNED || 0,
        PENDING: data?.PENDING || 0,
        INPROCESS: data?.INPROCESS || 0,
        COMPLETE: data?.COMPLETE || 0,
        REJECTED: data?.REJECTED || 0,
      });
    } catch (err) {
      console.error("❌ Load counts failed:", err);
    }
  };

  // ✅ Assign Ticket + Preloader + Toast + Sound
  const assign = async () => {
    if (!selectedTicket || !selectedTechnician)
      return showToast("danger", "Select a technician first!");

    try {
      setMailLoading(true);
      setMailMessage("Assigning ticket & sending mail...");

      const body = {
        assigned_to: selectedTechnician,
        start_date: startDate || new Date().toISOString().split("T")[0],
        end_date: endDate || null,
        priority: priority || "Medium",
        remarks: remarks || null,
      };

      const res = await fetch(
        `${API}/api/admin/tickets/${selectedTicket.id}/assign`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (res.ok) {
        await loadTickets();
        await loadCounts();
        showToast(
          "success",
          `✅ Mail sent & Ticket ${selectedTicket.id} assigned successfully!`
        );
        closeModal();
      } else {
        showToast("danger", data?.error || "❌ Assign failed");
      }
    } catch (err) {
      console.error("❌ Assign error:", err);
      showToast("danger", "❌ Error while sending assign mail");
    } finally {
      setMailLoading(false);
    }
  };

  // ✅ Reject Ticket + Preloader + Toast + Sound
  const handleReject = async (ticketId) => {
    if (!window.confirm("Are you sure you want to reject this ticket?")) return;
    try {
      setMailLoading(true);
      setMailMessage("Rejecting ticket & sending mail...");

      const res = await fetch(`${API}/api/admin/tickets/${ticketId}/reject`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        showToast("success", "❌ Ticket rejected and mail sent successfully!");
        await loadTickets();
        await loadCounts();
      } else {
        showToast("danger", data?.error || "Reject failed");
      }
    } catch (err) {
      console.error("❌ Reject error:", err);
      showToast("danger", "Server error during reject");
    } finally {
      setMailLoading(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedTicket(null);
    setSelectedTechnician("");
    setStartDate("");
    setEndDate("");
    setPriority("");
    setRemarks("");
  };

  const getStatusBadge = (status) => {
    const map = {
      ALL: "bg-secondary",
      NOT_ASSIGNED: "bg-info text-dark",
      ASSIGNED: "bg-warning text-dark",
      PENDING: "bg-dark text-light",
      INPROCESS: "bg-primary",
      COMPLETE: "bg-success",
      REJECTED: "bg-danger",
    };
    return map[status?.toUpperCase()] || "bg-secondary";
  };

  // Auto Refresh
  useEffect(() => {
    loadTickets(true);
    loadCounts();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadTickets(true);
        loadCounts();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  useEffect(() => {
    loadTechnicians();
    loadCounts();
  }, []);

  const statusOrder = [
    "ALL",
    "NOT_ASSIGNED",
    "ASSIGNED",
    "PENDING",
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
          background: "linear-gradient(90deg, #007bff, #6610f2)",
        }}
      >
        <div className="d-flex justify-content-between align-items-center flex-wrap">
          <h3 className="fw-bold mb-0">Admin Dashboard — {managerName}</h3>
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
              width: "12%",
              minWidth: "120px",
              transition: "transform 0.3s",
            }}
          >
            <h6 className="fw-semibold text-uppercase small mb-1">
              {key.replace("_", " ")}
            </h6>
            <h3 className="fw-bold mb-0">{counts[key] || 0}</h3>
          </div>
        ))}
      </div>

      {/* FILTER BUTTONS */}
      <div className="d-flex flex-wrap justify-content-center gap-3 mb-5">
        {statusOrder.map((s) => (
          <div key={s} className="text-center" style={{ width: "12%" }}>
            <button
              className={`btn btn-sm w-100 fw-semibold ${
                filter === s ? "btn-primary" : "btn-outline-primary"
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
          style={{ background: "linear-gradient(90deg, #0d6efd, #6f42c1)" }}
        >
          <h5 className="mb-0 fw-semibold">Tickets Overview</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-primary text-center">
                <tr>
                  <th>Employee ID</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>IP</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Issue</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-3 text-muted">
                      Loading...
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
                    <tr key={t.id} className="text-center">
                      <td>{t.emp_id || "-"}</td>
                      <td>
                        <strong>{t.full_name}</strong>
                        <br />
                        <small className="text-muted">{t.username}</small>
                      </td>
                      <td>{t.department}</td>
                      <td>{t.system_ip || "-"}</td>
                      <td>
                        <span
                          className={`badge ${getStatusBadge(
                            t.status
                          )} px-3 py-2`}
                        >
                          {t.status || "Not Assigned"}
                        </span>
                      </td>
                      <td>{t.assigned_to || "-"}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            setSelectedTicket(t);
                            setShowIssueModal(true);
                          }}
                        >
                          View
                        </button>
                      </td>
                      <td>
                        <div className="d-flex justify-content-center gap-2 flex-wrap">
                          <button
                            className="btn btn-sm btn-warning"
                            disabled={t.status !== "NOT_ASSIGNED"}
                            onClick={() => {
                              setSelectedTicket(t);
                              setShowModal(true);
                            }}
                          >
                            Assign
                          </button>
                          <button
  className="btn btn-sm btn-danger"
  disabled={t.status !== "NOT_ASSIGNED"}
  onClick={() => handleReject(t.id)}
>
  Reject
</button>

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ISSUE MODAL */}
      {showIssueModal && selectedTicket && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-info text-white rounded-top-4">
                <h5 className="modal-title">
                  Issue Details — {selectedTicket.emp_id}
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setShowIssueModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  <strong>Employee:</strong> {selectedTicket.full_name}
                </p>
                <p>
                  <strong>Department:</strong> {selectedTicket.department}
                </p>
                <p>
                  <strong>IP Address:</strong> {selectedTicket.system_ip}
                </p>
                <hr />
                <p>
                  <strong>Issue:</strong>
                  <br />
                  {selectedTicket.issue_text}
                </p>
                <hr />
                <p>
                  <strong>Submitted On:</strong>{" "}
                  {selectedTicket.created_at
                    ? new Date(selectedTicket.created_at).toLocaleString()
                    : "Not Available"}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowIssueModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN MODAL */}
      {showModal && selectedTicket && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-primary text-white rounded-top-4">
                <h5 className="modal-title">
                  Assign Ticket — {selectedTicket.emp_id}
                </h5>
                <button className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-12">
                    <label className="form-label fw-semibold">
                      Assign To (Technician)
                    </label>
                    <select
                      className="form-select"
                      value={selectedTechnician}
                      onChange={(e) => setSelectedTechnician(e.target.value)}
                    >
                      <option value="">Select Technician</option>
                      {technicianList.map((t) => (
                        <option
                          key={t.username}
                          value={t.name || t.full_name || t.username}
                        >
                          {t.name || t.full_name || t.username} ({t.username})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={
                        startDate || new Date().toISOString().split("T")[0]
                      }
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={endDate || ""}
                      min={startDate || new Date().toISOString().split("T")[0]}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Priority</label>
                    <select
                      className="form-select"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="">Select Priority</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Remarks</label>
                    <textarea
                      rows="2"
                      className="form-control"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={assign}>
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📩 Preloader Spinner Overlay */}
      {mailLoading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center"
          style={{ background: "rgba(255,255,255,0.8)", zIndex: 2000 }}
        >
          <div
            className="spinner-border text-primary mb-3"
            style={{ width: "3rem", height: "3rem" }}
            role="status"
          ></div>
          <p className="fw-semibold text-primary">{mailMessage}</p>
        </div>
      )}

      {/* ✅ Success Animation */}
      {showSuccessIcon && (
        <div
          className="position-fixed top-50 start-50 translate-middle text-success"
          style={{ zIndex: 3000, animation: "pop 1s ease" }}
        >
          <i
            className="bi bi-check-circle-fill"
            style={{ fontSize: "4rem", animation: "zoomIn 0.5s ease" }}
          ></i>
        </div>
      )}

      {/* Toast Notification */}
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
