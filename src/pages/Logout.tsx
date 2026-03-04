import React, { useEffect } from "react";
import { useAuth } from "@/app/authContext";
import { useNavigate } from "react-router-dom";

export default function Logout() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        logout();
        navigate("/", { replace: true });
    }, [logout, navigate]);

    return (
        <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center text-slate-100">
            <div className="w-12 h-12 rounded-full border-[3px] border-slate-700 border-t-blue-500 animate-spin"></div>
        </div>
    );
}
