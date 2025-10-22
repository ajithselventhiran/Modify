import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API = "http://localhost:5000"; // your backend base URL

export default function ManagerLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  // 🔑 Handle login submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password)
      return toast.warning("Please enter both username and password.");

    try {
      setLoading(true);
      const res = await axios.post(`${API}/api/login`, form);
      const { token, user } = res.data;

      // ✅ Save login info
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      toast.success("Login successful!", { autoClose: 1200, theme: "colored" });

      setTimeout(() => {
        if (user.role === "MANAGER") navigate("/manager");
        else if (user.role === "STAFF") navigate("/staff");
        else navigate("/");
      }, 1200);
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center min-vh-100"
      style={{ background: "linear-gradient(135deg, #1e3c72, #2a5298)" }}
    >
      <div
        className="card shadow-lg p-4"
        style={{ width: "360px", borderRadius: "18px", background: "rgba(255,255,255,0.95)" }}
      >
        <h3 className="text-center mb-4 fw-bold text-primary">Manager Login</h3>
        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Username</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter your username"
              value={form.username}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, username: e.target.value }))
              }
            />
          </div>

          {/* Password */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            className="btn btn-primary w-100 fw-bold py-2"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <ToastContainer />
      </div>
    </div>
  );
}
