import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import Today from "@/pages/Today";
import Create from "@/pages/Create";
import ActivityDetail from "@/pages/ActivityDetail";
import Progress from "@/pages/Progress";

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
      {
        path: "crear",
        element: <Create />,
      },
      {
        path: "actividad/:id",
        element: <ActivityDetail />,
      },
      {
        path: "progreso",
        element: <Progress />,
      },
    ],
  },
]);
