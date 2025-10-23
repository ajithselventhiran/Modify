import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const API = "http://localhost:5000"; // 🔗 Your backend API

export default function ManagerDashboard({ managerName = "Murugan R" }) {
  const [tickets, setTickets] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({
    NOT_ASSIGNED: 0,
    ASSIGNED: 0,
    PENDING: 0,
    INPROCESS: 0,
    COMPLETE: 0,
    FIXED: 0,
  });

  // 🔹 Modal States
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState("");
  const [remarks, setRemarks] = useState("");

  const token = localStorage.getItem("token");

  // 🔹 Load tickets by manager
  const load = async () => {
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
      console.error("Load tickets failed:", err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Load staff list for this manager
  const loadStaff = async () => {
    try {
      const res = await fetch(
        `${API}/api/manager/staff?manager=${encodeURIComponent(managerName)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();

      // ✅ Expect array of { username, name }
      setStaffList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load staff failed:", err);
      setStaffList([]);
    }
  };

  // 🔹 Load ticket counts
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
        }
      );
    } catch (err) {
      console.error("Load counts failed:", err);
      setCounts({
        NOT_ASSIGNED: 0,
        ASSIGNED: 0,
        PENDING: 0,
        INPROCESS: 0,
        COMPLETE: 0,
        FIXED: 0,
      });
    }
  };

  // 🔹 Assign ticket with modal data
  const assign = async () => {
    if (!selectedTicket || !selectedStaff)
      return alert("Select a staff member first!");

    try {
      const body = {
        assigned_to: selectedStaff,
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
        await load();
        await loadCounts();
        alert(`✅ Ticket ${selectedTicket.id} assigned to ${selectedStaff}`);
        setShowModal(false);
        setSelectedTicket(null);
        setSelectedStaff("");
        setStartDate("");
        setEndDate("");
        setPriority("");
        setRemarks("");
      } else {
        const data = await res.json();
        alert(data?.error || "❌ Assign failed");
      }
    } catch (err) {
      console.error("Assign error:", err);
    }
  };

  // 🔹 Status badge color mapping
  const getStatusBadge = (status) => {
    const map = {
      NOT_ASSIGNED: "bg-secondary",
      ASSIGNED: "bg-warning text-dark",
      PENDING: "bg-info text-dark",
      INPROCESS: "bg-primary",
      COMPLETE: "bg-success",
      FIXED: "bg-success",
    };
    return map[status?.toUpperCase()] || "bg-secondary";
  };

  // 🔹 Auto-load
  useEffect(() => {
    load();
  }, [filter]);

  useEffect(() => {
    loadStaff();
    loadCounts();
  }, []);

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h3 className="m-0 text-primary fw-bold">
          Manager Dashboard — {managerName}
        </h3>

        {/* Filter buttons */}
        <div className="d-flex gap-2 flex-wrap">
          {[
            "ALL",
            "NOT_ASSIGNED",
            "ASSIGNED",
            "PENDING",
            "INPROCESS",
            "COMPLETE",
            "FIXED",
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
                  {/* 🔹 Show Employee ID instead of Ticket ID */}
                  <td>{t.emp_id || "-"}</td>

                  <td>
                    {t.full_name}{" "}
                    <small className="text-muted">({t.username})</small>
                  </td>
                  <td>{t.department}</td>
                  <td style={{ maxWidth: 320 }}>
                    <div className="text-truncate">{t.issue_text}</div>
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
                  <td>
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && selectedTicket && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  Assign Ticket for {selectedTicket.emp_id}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  {/* Assign To */}
                  <div className="col-md-12">
                    <label className="form-label fw-semibold">Assign To</label>
                    <select
                      className="form-select"
                      value={selectedStaff}
                      onChange={(e) => setSelectedStaff(e.target.value)}
                    >
                      <option value="">Select Staff</option>
                      {staffList.map((s) => (
                        <option key={s.username} value={s.name}>
                          {s.name} ({s.username})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dates */}
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

                  {/* Priority */}
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

                  {/* Remarks */}
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
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={assign}
                >
                  Assigned
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
