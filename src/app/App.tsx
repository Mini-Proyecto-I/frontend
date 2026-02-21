import Today from "@/pages/Today";
import Create from "@/pages/Create";
import ActivityDetail from "@/pages/ActivityDetail";
import Progress from "@/pages/Progress";
import { AppLayout } from "./AppLayout";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

export default function App() {
  return (
    <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/hoy" replace />} />
            <Route path="hoy" element={<Today />} />
            <Route path="crear" element={<Create />} />
            <Route path="actividad/:id" element={<ActivityDetail />} />
            <Route path="progreso" element={<Progress />} />
          </Route>
        </Routes>
    </BrowserRouter>
  )
}
