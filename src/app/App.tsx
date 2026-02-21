import Today from "@/pages/Today";
import { AppLayout } from "./AppLayout";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

export default function App() {
  return (
    <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/hoy" element={<Today />} />
          </Route>
        </Routes>
    </BrowserRouter>
  )
}
