import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import Today from "@/pages/Today";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true, // ruta "/"
        element: <Today />,
      },
      {
        path: "hoy",
        element: <Today />,
      },
    ],
  },
]);
