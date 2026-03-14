import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import Today from "@/pages/Today";
import Create from "@/pages/Create";
import ActivityDetail from "@/pages/ActivityDetail";
import Progress from "@/pages/Progress";
import CreateSuccess from "@/pages/CreateSuccess";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import Calendar from "@/pages/Calendar";

export const router = createBrowserRouter([

  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        path: "registro",
        element: <Register />,
      },
      {
        path: "login",
        element: <Login />,
      },
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
        path: "crear/exito",
        element: <CreateSuccess />,
      },
      {
        path: "actividad/:id",
        element: <ActivityDetail />,
      },
      {
        path: "progreso",
        element: <Progress />,
      },
      {
        path: "calendario",
        element: <Calendar />,
      },
    ],
  },
]);
