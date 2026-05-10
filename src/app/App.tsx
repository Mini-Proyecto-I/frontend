import Today from "@/pages/Today";
import Create from "@/pages/Create";
import ActivityDetail from "@/pages/ActivityDetail";
import Progress from "@/pages/Progress";
import CreateSuccess from "@/pages/CreateSuccess";
import Calendar from "@/pages/Calendar";
import { AppLayout } from "./AppLayout";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import Landing from "@/pages/Landing";
import Logout from "@/pages/Logout";

import { ProtectedRoute } from "./ProtectedRoute";
import { TooltipProvider } from "@radix-ui/react-tooltip";

const router = createBrowserRouter([
  {
    path: "/logout",
    element: <Logout />,
  },
  {
    element: (
      <TooltipProvider>
        <AppLayout />
      </TooltipProvider>
    ),
    children: [
      {
        path: "/",
        element: <Landing />,
      },
      {
        path: "/registro",
        element: <Register />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/hoy",
            element: <Today />,
          },
          {
            path: "/calendario",
            element: <Calendar />,
          },
          {
            path: "/crear",
            element: <Create />,
          },
          {
            path: "/crear/exito",
            element: <CreateSuccess />,
          },
          {
            path: "/actividad/:id",
            element: <ActivityDetail />,
          },
          {
            path: "/progreso",
            element: <Progress />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
