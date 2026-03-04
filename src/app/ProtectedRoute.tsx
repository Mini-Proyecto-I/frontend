import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './authContext';

export function ProtectedRoute() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        // You could return a loading spinner here
        return <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center text-slate-400">Cargando...</div>;
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
