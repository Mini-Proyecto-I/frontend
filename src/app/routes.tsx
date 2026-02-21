import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import Today from "@/pages/Today";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/hoy" replace />,
      },
      {
        path: "hoy",
        element: <Today />,
      },
    ],
  },
]);
