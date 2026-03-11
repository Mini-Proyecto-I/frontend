import Today from "@/pages/Today";
import Create from "@/pages/Create";
import ActivityDetail from "@/pages/ActivityDetail";
import Progress from "@/pages/Progress";
import CreateSuccess from "@/pages/CreateSuccess";
import Calendar from "@/pages/Calendar";
import { AppLayout } from "./AppLayout";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import Landing from "@/pages/Landing";
import Logout from "@/pages/Logout";

import { ProtectedRoute } from "./ProtectedRoute";
import { TooltipProvider } from "@radix-ui/react-tooltip";

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <Routes>
          <Route path="/logout" element={<Logout />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/hoy" element={<Today />} />
              <Route path="/calendario" element={<Calendar />} />
              <Route path="/crear" element={<Create />} />
              <Route path="/crear/exito" element={<CreateSuccess />} />
              <Route path="/actividad/:id" element={<ActivityDetail />} />
              <Route path="/progreso" element={<Progress />} />
            </Route>
          </Route>
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  )
}
