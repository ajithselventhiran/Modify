import { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API = "http://localhost:5000";

export default function TicketForm() {
  const [username, setUsername] = useState("");
  const [emp, setEmp] = useState(null);
  const [form, setForm] = useState({
    issue_text: "",
    reporting_to: [],
    remarks: "",
  });
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [reportingList, setReportingList] = useState([]);
  const [completedTickets, setCompletedTickets] = useState([]);


  //  Get Public IP
  useEffect(() => {
    axios
      .get("https://api.ipify.org?format=json")
      .then((res) => setIp(res.data.ip))
      .catch(() => setIp("Unavailable"));
  }, []);

  //  Search User
  useEffect(() => {
    if (!username.trim()) {
      setEmp(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API}/api/employees/find`, {
          params: { key: username },
        });

        if (data && data.emp_id) {
          setEmp(data);
          if (data.reporting_to && !form.reporting_to.length) {
            setForm((prev) => ({
              ...prev,
              reporting_to: [data.reporting_to],
            }));
          }
          toast.success(`User data loaded for ${data.full_name}`, {
            autoClose: 1000,
            theme: "colored",
          });
        } else setEmp(null);
      } catch {
        setEmp(null);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  //  Progress bar animation
  useEffect(() => {
    if (!loading) return;
    setProgress(0);
    let val = 0;
    const interval = setInterval(() => {
      val += 5;
      if (val >= 100) {
        val = 100;
        clearInterval(interval);
      }
      setProgress(val);
    }, 70);
    return () => clearInterval(interval);
  }, [loading]);

  // Load Admin List
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const { data } = await axios.get(`${API}/api/admins`);
        setReportingList(data);
      } catch (err) {
        console.error("Admin list load பண்ண முடியல:", err);
        toast.error("⚠️ Admin list load பண்ண முடியல", { theme: "colored" });
      }
    };
    fetchAdmins();
  }, []);

  //  Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".dropdown-container")) setDropdownOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  //  Submit Ticket
  const submitTicket = async (e) => {
    e.preventDefault();
    if (!emp) return toast.error("⚠️ Please enter a valid username.");
    if (!form.issue_text.trim())
      return toast.warning("✏️ Please describe your issue before submitting.");
    if (!form.reporting_to.length)
      return toast.warning("👤 Please select at least one admin.");

    try {
      setLoading(true);
      const payload = {
        emp_id: emp.emp_id,
        username: emp.username,
        full_name: emp.full_name,
        department: emp.department,
        reporting_to: form.reporting_to,
        issue_text: form.issue_text,
        remarks: form.remarks,
        ip_address: ip,
      };

      await axios.post(`${API}/api/tickets`, payload);

      setTimeout(() => {
        toast.success("✅ Ticket Submitted Successfully!", {
          position: "top-center",
          autoClose: 2500,
          theme: "colored",
        });
        setForm({ issue_text: "", reporting_to: [], remarks: "" });
        setUsername("");
        setEmp(null);
        setLoading(false);
      }, 1000);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "❌ Submit failed. Try again."
      );
      setLoading(false);
    }
  };

  return (
    <>
      {/* Inject your CSS styles directly */}
      <style>
        {`
          body {
            background: radial-gradient(circle at top left, #001f3f, #003366 40%, #000814 100%);
            background-attachment: fixed;
            font-family: "Poppins", sans-serif;
            color: #fff;
          }

          .card {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(12px);
            border-radius: 18px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
          }

          .form-control {
            background: whitesmoke;
            border: none;
            border-radius: 10px;
            padding: 14px;
            color: #0b2239;
            font-size: 1rem;
            box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.1);
          }

          .form-control::placeholder {
            color: #888;
            transition: all 0.2s ease;
          }

          .form-control:focus::placeholder {
            transform: translateY(-14px);
            font-size: 0.8rem;
            color: #4a90e2;
          }

          .form-control:focus {
            outline: none;
            box-shadow: 0 0 0 3px rgba(41, 121, 255, 0.4);
            background: #fff;
          }

          .form-label {
            font-weight: 600;
            color: #f8f9fa;
            margin-bottom: 6px;
            display: block;
          }

          .btn-success {
            background: transparent;
            color: #00eaff;
            border: 2px solid #00eaff;
            border-radius: 12px;
            padding: 12px 28px;
            font-size: 1.05rem;
            font-weight: 600;
            letter-spacing: 0.5px;
            transition: all 0.4s ease;
            box-shadow: 0 0 10px rgba(0, 234, 255, 0.3);
          }

          .btn-success:hover {
            background: #00eaff;
            color: #000;
            letter-spacing: 1px;
            box-shadow: 0 0 20px #00eaff, 0 0 40px #00eaff;
          }

          .progress {
            background-color: rgba(255, 255, 255, 0.3);
          }

          .progress-bar {
            border-radius: 10px;
          }

          .dropdown-container .form-select {
            background: whitesmoke;
            border: none;
            border-radius: 10px;
            box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.1);
          }

          .dropdown-container .form-select:hover {
            box-shadow: 0 0 5px rgba(41, 121, 255, 0.5);
          }

          .text-primary { color: #e3f2fd !important; }
          .text-dark { color: #fff !important; }
          .text-muted { color: #cfd8dc !important; }
        `}
      </style>

      <div
        className="d-flex justify-content-center align-items-start min-vh-100"
        style={{ paddingTop: "60px", paddingBottom: "40px" }}
      >
        <div className="card shadow-lg p-4" style={{ width: "600px" }}>
          <h3 className="text-center mb-3 text-primary fw-bold">
            Rapid Ticketing System
          </h3>
          <p className="text-center text-muted mb-4">
            System IP: <b className="text-dark">{ip || "Fetching..."}</b>
          </p>

          {/* 🔍 User Search */}
          <div className="card p-3 mb-4 border-0 shadow-sm">
            <div className="mb-3">
              <label className="form-label">Username</label>
              <input
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>

            {loading && <p className="text-secondary">Searching...</p>}

            {emp && (
              <div className="row g-3 mt-1">
                <div className="col-md-6">
                  <label className="form-label">Full Name</label>
                  <input className="form-control" value={emp.full_name} readOnly />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Emp ID</label>
                  <input className="form-control" value={emp.emp_id} readOnly />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Department</label>
                  <input className="form-control" value={emp.department} readOnly />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Reporting To (Admin)</label>
                  <input
                    className="form-control"
                    value={emp.reporting_to || ""}
                    readOnly
                  />
                </div>
              </div>
            )}
          </div>

          {/*  Ticket Form */}
          <form className="p-2" onSubmit={submitTicket}>
            <div className="mb-3">
              <label className="form-label">Issue</label>
              <textarea
                className="form-control"
                rows={4}
                value={form.issue_text}
                onChange={(e) =>
                  setForm((s) => ({ ...s, issue_text: e.target.value }))
                }
                placeholder="Describe your issue..."
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Remarks (Optional)</label>
              <input
                type="text"
                className="form-control"
                value={form.remarks}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, remarks: e.target.value }))
                }
                placeholder="Any additional notes..."
              />
            </div>

            {/* Reporting Dropdown */}
            <div className="mb-3 position-relative dropdown-container">
              <label className="form-label d-block">Reporting To (Admin)</label>
              <div
                className="form-select text-start"
                style={{
                  cursor: "pointer",
                  fontSize: "1rem",
                  height: "45px",
                  display: "flex",
                  alignItems: "center",
                }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {form.reporting_to.length
                  ? form.reporting_to.join(", ")
                  : "-- Select Admin(s) --"}
              </div>

              {dropdownOpen && (
                <div
                  className="border rounded bg-white shadow mt-1 p-3"
                  style={{
                    zIndex: 9999,
                    maxHeight: "150px",
                    overflowY: "auto",
                    fontSize: "1.05rem",
                  }}
                >
                  {reportingList.map((person, index) => (
                    <div
                      key={index}
                      className="form-check py-2 px-2 d-flex align-items-center"
                      style={{
                        borderBottom:
                          index !== reportingList.length - 1
                            ? "1px solid #eee"
                            : "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`admin-${index}`}
                        style={{
                          transform: "scale(1.3)",
                          cursor: "pointer",
                          marginLeft: "10px",
                          marginRight: "12px",
                        }}
                        checked={form.reporting_to.includes(person)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm((prev) => ({
                              ...prev,
                              reporting_to: [...prev.reporting_to, person],
                            }));
                          } else {
                            setForm((prev) => ({
                              ...prev,
                              reporting_to: prev.reporting_to.filter(
                                (p) => p !== person
                              ),
                            }));
                          }
                        }}
                      />
                      <label
                        className="form-check-label"
                        htmlFor={`admin-${index}`}
                        style={{ cursor: "pointer", flex: 1 }}
                      >
                        {person}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button + Progress */}
            <div className="mt-4 text-end">
              <button
                type="submit"
                className="btn btn-success fw-bold shadow-sm py-2 px-4"
                style={{ fontSize: "1.05rem", minWidth: "160px" }}
                disabled={loading || !emp}
              >
                {loading ? `Submitting... ${progress}%` : "Submit Ticket"}
              </button>

              {loading && (
                <div
                  className="progress mt-2"
                  style={{
                    height: "8px",
                    borderRadius: "6px",
                    width: "100%",
                  }}
                >
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated bg-success"
                    role="progressbar"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </form>

          <ToastContainer />
        </div>
      </div>



      {/* ===================================================== */}
{/* Know Your Ticket Status Section */}
{/* ===================================================== */}
<div className="mt-5 pt-4 border-top">
  <h5 className="text-center text-primary mb-3">Know Your Ticket Status</h5>

  <div className="d-flex justify-content-center align-items-center gap-2 mb-3">
    <input
      type="text"
      className="form-control"
      placeholder="Enter your Employee ID"
      style={{ width: "250px" }}
      id="statusEmpId"
    />
    <button
      className="btn btn-success"
      onClick={async () => {
        const empInput = document.getElementById("statusEmpId").value.trim();
        if (!empInput) return toast.warning("Please enter Employee ID.");

        // ✅ Ensure only logged-in employee can view their own data
        if (!emp || empInput !== emp.emp_id.toString()) {
          return toast.error("⚠️ You can only view your own ticket status!");
        }

        try {
          const { data } = await axios.get(`${API}/api/tickets/completed`, {
            params: { emp_id: empInput },
          });

          if (!data.length) {
            toast.info("No completed tickets found yet.");
            setCompletedTickets([]);
          } else {
            setCompletedTickets(data);
          }
        } catch (err) {
          toast.error("❌ Failed to fetch ticket status");
        }
      }}
    >
      Submit
    </button>
  </div>

  {/* Tickets Table */}
  {completedTickets && completedTickets.length > 0 && (
    <div className="table-responsive">
      <table className="table table-bordered table-sm table-striped text-center align-middle">
        <thead className="table-light">
          <tr>
            <th>ID</th>
            <th>Issue</th>
            <th>Admin</th>
            <th>Created</th>
            <th>Updated</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {completedTickets.map((t, i) => (
            <tr key={i}>
              <td>{t.id}</td>
              <td>{t.issue_text}</td>
              <td>{t.reporting_to}</td>
              <td>{new Date(t.created_at).toLocaleDateString()}</td>
              <td>{new Date(t.updated_at).toLocaleDateString()}</td>
              <td>
                <span className="badge bg-success">{t.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>

    </>
  );
}



