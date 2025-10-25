import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const API = "http://localhost:5000"; // 🔗 Backend API

export default function ManagerDashboard({ managerName = "Venkatesan M" }) {
  const [tickets, setTickets] = useState([]);
  const [technicianList, setTechnicianList] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({
    NOT_ASSIGNED: 0,
    ASSIGNED: 0,
    PENDING: 0,
    INPROCESS: 0,
    COMPLETE: 0,
    FIXED: 0,
    REJECTED: 0,
  });

  // 🔹 Modal States
  const [showModal, setShowModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState("");
  const [remarks, setRemarks] = useState("");

  const token = localStorage.getItem("token");

  // 🔹 Load tickets assigned to this manager
  const loadTickets = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ manager: managerName });
      if (filter !== "ALL") q.set("status", filter);
      const res = await fetch(`${API}/api/manager/tickets?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Load tickets failed:", err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Load technician list
  const loadTechnicians = async () => {
    try {
      const res = await fetch(`${API}/api/manager/technicians`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log("🔧 Technicians loaded:", data);
      setTechnicianList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Load technicians failed:", err);
      setTechnicianList([]);
    }
  };

  // 🔹 Load ticket counts by status
  const loadCounts = async () => {
    try {
      const res = await fetch(
        `${API}/api/manager/tickets/counts?manager=${encodeURIComponent(
          managerName
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setCounts(
        data || {
          NOT_ASSIGNED: 0,
          ASSIGNED: 0,
          PENDING: 0,
          INPROCESS: 0,
          COMPLETE: 0,
          FIXED: 0,
          REJECTED: 0,
        }
      );
    } catch (err) {
      console.error("❌ Load counts failed:", err);
      setCounts({
        NOT_ASSIGNED: 0,
        ASSIGNED: 0,
        PENDING: 0,
        INPROCESS: 0,
        COMPLETE: 0,
        FIXED: 0,
        REJECTED: 0,
      });
    }
  };

  // 🔹 Assign Ticket
  const assign = async () => {
    if (!selectedTicket || !selectedTechnician)
      return alert("Select a technician first!");

    try {
      const body = {
        assigned_to: selectedTechnician,
        start_date: startDate,
        end_date: endDate,
        priority,
        remarks,
      };

      const res = await fetch(
        `${API}/api/manager/tickets/${selectedTicket.id}/assign`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (res.ok) {
        await loadTickets();
        await loadCounts();
        alert(`✅ Ticket ${selectedTicket.id} assigned to ${selectedTechnician}`);
        closeModal();
      } else {
        const data = await res.json();
        alert(data?.error || "❌ Assign failed");
      }
    } catch (err) {
      console.error("❌ Assign error:", err);
    }
  };

  // 🔹 Reject Ticket
  const handleReject = async (ticketId) => {
    if (!window.confirm("Are you sure you want to reject this ticket?")) return;

    try {
      const res = await fetch(`${API}/api/manager/tickets/${ticketId}/reject`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        alert("❌ Ticket rejected successfully");
        await loadTickets();
        await loadCounts();
      } else {
        const data = await res.json();
        alert(data?.error || "Reject failed");
      }
    } catch (err) {
      console.error("❌ Reject error:", err);
    }
  };

  // 🔹 Delete Ticket (for rejected ones only)
  const handleDelete = async (ticketId) => {
    if (!window.confirm("⚠️ Are you sure you want to permanently delete this rejected ticket?")) return;

    try {
      const res = await fetch(`${API}/api/manager/tickets/${ticketId}/delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert("🗑️ Ticket deleted successfully");
        await loadTickets();
        await loadCounts();
      } else {
        const data = await res.json();
        alert(data?.error || "Delete failed");
      }
    } catch (err) {
      console.error("❌ Delete error:", err);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTicket(null);
    setSelectedTechnician("");
    setStartDate("");
    setEndDate("");
    setPriority("");
    setRemarks("");
  };

  // 🔹 Status badge colors
  const getStatusBadge = (status) => {
    const map = {
      NOT_ASSIGNED: "bg-secondary",
      ASSIGNED: "bg-warning text-dark",
      PENDING: "bg-info text-dark",
      INPROCESS: "bg-primary",
      COMPLETE: "bg-success",
      FIXED: "bg-dark",
      REJECTED: "bg-danger",
    };
    return map[status?.toUpperCase()] || "bg-secondary";
  };

  // 🔹 Auto load data
  useEffect(() => {
    loadTickets();
  }, [filter]);

  useEffect(() => {
    loadTechnicians();
    loadCounts();
  }, []);

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h3 className="m-0 text-primary fw-bold">
          Manager Dashboard — {managerName}
        </h3>

        {/* Filter Buttons */}
        <div className="d-flex gap-2 flex-wrap">
          {[
            "ALL",
            "NOT_ASSIGNED",
            "ASSIGNED",
            "PENDING",
            "INPROCESS",
            "COMPLETE",
            "FIXED",
            "REJECTED",
          ].map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${
                filter === s ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => setFilter(s)}
            >
              {s}
              {s !== "ALL" ? ` (${counts[s] || 0})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Employee ID</th>
              <th>Employee</th>
              <th>Department</th>
              <th>Issue</th>
              <th>IP</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center text-secondary">
                  Loading…
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center text-muted">
                  No tickets found.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id}>
                  <td>{t.emp_id || "-"}</td>
                  <td>
                    {t.full_name}{" "}
                    <small className="text-muted">({t.username})</small>
                  </td>
                  <td>{t.department}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-info"
                      onClick={() => {
                        setSelectedTicket(t);
                        setShowIssueModal(true);
                      }}
                    >
                      View
                    </button>
                  </td>
                  <td>{t.system_ip || "-"}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(t.status)}`}>
                      {t.status
                        ? t.status.charAt(0).toUpperCase() +
                          t.status.slice(1).toLowerCase()
                        : "Not Assigned"}
                    </span>
                  </td>
                  <td>{t.assigned_to || "-"}</td>
                  <td className="d-flex gap-2 flex-wrap">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      disabled={t.status === "ASSIGNED" || t.status === "FIXED"}
                      onClick={() => {
                        setSelectedTicket(t);
                        setShowModal(true);
                      }}
                    >
                      Assign
                    </button>

                    <button
                      className="btn btn-sm btn-outline-danger"
                      disabled={t.status === "REJECTED" || t.status === "FIXED"}
                      onClick={() => handleReject(t.id)}
                    >
                      Reject
                    </button>

                    {/* ✅ Show Delete button only when Rejected */}
                    {t.status === "REJECTED" && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(t.id)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Issue View Modal */}
      {showIssueModal && selectedTicket && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">
                  Issue Details — {selectedTicket.emp_id}
                </h5>
                <button
                  type="button"
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

      {/* Assign Modal */}
      {showModal && selectedTicket && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  Assign Ticket — {selectedTicket.emp_id}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeModal}
                ></button>
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
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={endDate}
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
    </div>
  );
}
