import { createRoot } from "react-dom/client";
import App from "@/app/App";
import "./index.css";
import { AuthProvider } from "@/app/authContext";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
