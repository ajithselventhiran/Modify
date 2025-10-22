import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const API = "http://localhost:5000"; // or your API_URL

export default function ManagerDashboard({ managerName = "Murugan R" }) {
  const [tickets, setTickets] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({ PENDING: 0, ASSIGNED: 0, FIXED: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ manager: managerName });
      if (filter !== "ALL") q.set("status", filter);
      const res = await fetch(`${API}/api/manager/tickets?${q.toString()}`);
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    const res = await fetch(`${API}/api/manager/staff?manager=${encodeURIComponent(managerName)}`);
    const data = await res.json();
    setStaffList(Array.isArray(data) ? data : []);
  };

  const loadCounts = async () => {
    const res = await fetch(`${API}/api/manager/tickets/counts?manager=${encodeURIComponent(managerName)}`);
    const data = await res.json();
    setCounts(data || { PENDING:0, ASSIGNED:0, FIXED:0 });
  };

  useEffect(() => { load(); }, [filter]);
  useEffect(() => { loadStaff(); loadCounts(); }, []);

  const assign = async (id, staff) => {
    if (!staff) return;
    const res = await fetch(`${API}/api/manager/tickets/${id}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to: staff }),
    });
    if (res.ok) {
      await load();
      await loadCounts();
      alert(`Assigned to ${staff}`);
    } else {
      const data = await res.json();
      alert(data?.error || "Assign failed");
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="m-0">Manager Dashboard — {managerName}</h3>
        <div className="d-flex gap-2">
          {["ALL","PENDING","ASSIGNED","FIXED"].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${filter===s ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setFilter(s)}
            >
              {s}{s!=="ALL" ? ` (${counts[s] || 0})` : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>ID</th>
              <th>Employee</th>
              <th>Department</th>
              <th>Issue</th>
              <th>IP</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Assign</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="text-center">Loading…</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan="8" className="text-center">No tickets</td></tr>
            ) : tickets.map(t => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.full_name} <small className="text-muted">({t.username})</small></td>
                <td>{t.department}</td>
                <td style={{maxWidth: 320}}><div className="text-truncate">{t.issue_text}</div></td>
                <td>{t.system_ip || "-"}</td>
                <td>
                  <span className={
                    "badge " + (t.status === "FIXED" ? "bg-success"
                      : t.status === "ASSIGNED" ? "bg-warning text-dark"
                      : "bg-secondary")
                  }>{t.status}</span>
                </td>
                <td>{t.assigned_to || "-"}</td>
                <td style={{minWidth: 180}}>
                  <select
                    className="form-select form-select-sm"
                    defaultValue=""
                    onChange={(e) => assign(t.id, e.target.value)}
                  >
                    <option value="" disabled>Select Staff</option>
                    {staffList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
