import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const API = "http://localhost:5000";

export default function StaffDashboard({ staffName = "Staff A" }) {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState({}); // { [id]: "text" }

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ staff: staffName });
      if (filter !== "ALL") q.set("status", filter);
      const res = await fetch(`${API}/api/staff/my-tickets?${q.toString()}`);
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const markFixed = async (id) => {
    const res = await fetch(`${API}/api/staff/tickets/${id}/fix`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remark: note[id] || "" }),
    });
    if (res.ok) {
      setNote(n => ({ ...n, [id]: "" }));
      await load();
      alert("Marked FIXED");
    } else {
      const data = await res.json();
      alert(data?.error || "Update failed");
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="m-0">My Assigned Tickets — {staffName}</h3>
        <div className="d-flex gap-2">
          {["ALL","ASSIGNED","FIXED"].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${filter===s ? "btn-success" : "btn-outline-success"}`}
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>ID</th>
              <th>From</th>
              <th>Department</th>
              <th>Issue</th>
              <th>Remarks</th>
              <th>Fix Note</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="text-center">Loading…</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan="7" className="text-center">No tickets</td></tr>
            ) : tickets.map(t => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.full_name}</td>
                <td>{t.department}</td>
                <td style={{maxWidth: 320}}><div className="text-truncate">{t.issue_text}</div></td>
                <td style={{maxWidth: 240}}><div className="text-truncate">{t.remarks || "-"}</div></td>
                <td style={{minWidth: 220}}>
                  <input
                    className="form-control form-control-sm"
                    placeholder="What did you fix?"
                    value={note[t.id] || ""}
                    onChange={(e) => setNote(n => ({ ...n, [t.id]: e.target.value }))}
                  />
                </td>
                <td>
                  {t.status !== "FIXED" ? (
                    <button className="btn btn-sm btn-success" onClick={() => markFixed(t.id)}>
                      Mark Fixed
                    </button>
                  ) : <span className="badge bg-success">FIXED</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
