import { Routes, Route } from "react-router-dom";
import "./App.css";
import TicketForm from "./Pages/TicketForm.jsx";
import LoginPage from "./Pages/Login.jsx";
import TechnicianDashboard from "./Pages/TechnicianDashboard.jsx";
import AdminDashboard from "./Pages/AdminDashboard.jsx";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<TicketForm/>} />
        <Route path="/login" element={<LoginPage/>} />
        <Route path="/admin" element={<AdminDashboard/>} />
        <Route path="/technician" element={<TechnicianDashboard/>} />
      </Routes>
    </>
  );
}
