import { Routes, Route } from "react-router-dom";
import ManagerLogin from "./Pages/ManagerLogin.jsx";
import ManagerDashboard from "./Pages/ManagerDashboard.jsx";
import StaffDashboard from "./Pages/StaffDashboard.jsx";
import "./App.css";
import InputForm from "./Pages/Inputform.jsx";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<InputForm/>} />
        <Route path="/login" element={<ManagerLogin />} />
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/staff" element={<StaffDashboard />} />
      </Routes>
    </>
  );
}
