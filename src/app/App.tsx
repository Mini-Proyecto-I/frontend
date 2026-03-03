import Today from "@/pages/Today";
import Create from "@/pages/Create";
import ActivityDetail from "@/pages/ActivityDetail";
import Progress from "@/pages/Progress";
import CreateSuccess from "@/pages/CreateSuccess";
import { AppLayout } from "./AppLayout";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import Landing from "@/pages/Landing";
import Logout from "@/pages/Logout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/registro" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />

        <Route element={<AppLayout />}>
          <Route path="/hoy" element={<Today />} />
          <Route path="/crear" element={<Create />} />
          <Route path="/crear/exito" element={<CreateSuccess />} />
          <Route path="/actividad/:id" element={<ActivityDetail />} />
          <Route path="/progreso" element={<Progress />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
