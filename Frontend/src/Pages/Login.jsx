import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API = "http://localhost:5000"; //  Backend API

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  // Handle Login
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username || !form.password)
      return toast.warning("Please enter both username and password.");

    try {
      setLoading(true);

      //  Clear old session before new login
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      //  Login API
      const res = await axios.post(`${API}/api/login`, form);
      const { token, user } = res.data;

      if (!token || !user) throw new Error("Invalid login response");

      //  OPTIONAL: fetch user contact info (email, dept, etc.) from backend
      let contactInfo = {};
      try {
        const userRes = await axios.get(`${API}/api/employees/find`, {
          params: { key: user.username },
        });
        if (userRes.data?.email)
          contactInfo = {
            email: userRes.data.email,
            department: userRes.data.department,
          };
      } catch {
        console.warn("⚠️ Could not fetch contact info");
      }

      //  Save token + user + contact info
      const fullUser = { ...user, ...contactInfo };
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(fullUser));

      toast.success("✅ Login successful!", {
        autoClose: 1000,
        theme: "colored",
      });

      //  Role-based redirect
      setTimeout(() => {
        if (user.role === "ADMIN") {
          navigate("/admin", { replace: true });
        } else if (user.role === "TECHNICIAN") {
          navigate("/technician", { replace: true });
        } else {
          toast.error("User login not allowed.");
        }
      }, 1000);
    } catch (err) {
      console.error("Login error:", err);
      toast.error(err.response?.data?.error || "❌ Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center min-vh-100"
      style={{
        background: "linear-gradient(135deg, #1e3c72, #2a5298)",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div
        className="card shadow-lg p-4"
        style={{
          width: "360px",
          borderRadius: "18px",
          background: "rgba(255,255,255,0.95)",
        }}
      >
        <h3 className="text-center mb-4 fw-bold text-primary">
          Admin / Technician Login
        </h3>

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

          {/* Submit */}
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
