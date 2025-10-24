import { Routes, Route } from "react-router-dom";

import ManagerDashboard from "./Pages/ManagerDashboard.jsx";

import "./App.css";
import InputForm from "./Pages/Inputform.jsx";
import LoginPage from "./Pages/ManagerLogin.jsx";
import TechnicianDashboard from "./Pages/StaffDashboard.jsx";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<InputForm/>} />
        <Route path="/login" element={<LoginPage/>} />
        <Route path="/manager" element={<ManagerDashboard/>} />
        <Route path="/technician" element={<TechnicianDashboard/>} />
      </Routes>
    </>
  );
}
