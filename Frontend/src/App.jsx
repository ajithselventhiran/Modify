import { Routes, Route } from "react-router-dom";
import InputForm from "./Pages/Inputform.jsx";
import "./App.css";

export default function App() {
  return (
    <div>
      <Routes>
        {/* 👇 Default route directly shows InputForm */}
        <Route path="/" element={<InputForm />} />
      </Routes>
    </div>
  );
}
