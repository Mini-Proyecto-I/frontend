import React, { useState, useEffect } from "react";
import { Button } from "@/shared/components/button";
import { ArrowRight, Clock, AlertTriangle, TrendingUp, Play, Bell, BarChart2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/authContext";
import { getUserStats } from "@/api/services/stats";

export default function Landing() {
    const navigate = useNavigate();
    const { isAuthenticated, loading } = useAuth();
    const [totalUsers, setTotalUsers] = useState<number | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

    React.useEffect(() => {
        if (!loading && isAuthenticated) {
            navigate("/hoy", { replace: true });
        }
    }, [isAuthenticated, loading, navigate]);

    useEffect(() => {
        // Cargar estadísticas de usuarios
        setIsLoadingStats(true);
        getUserStats()
            .then((data) => {
                // Debug: ver qué estamos recibiendo
                console.log("📊 Respuesta completa del API:", data);
                
                // La respuesta puede venir directamente o dentro de un objeto
                // Intentar diferentes formas de acceder al dato
                let count = null;
                
                if (data && typeof data === 'object') {
                    // Si viene como { total_users: 19 }
                    if ('total_users' in data) {
                        count = data.total_users;
                    }
                    // Si viene como { data: { total_users: 19 } }
                    else if ('data' in data && data.data && 'total_users' in data.data) {
                        count = data.data.total_users;
                    }
                    // Si viene directamente como número (poco probable)
                    else if (typeof data === 'number') {
                        count = data;
                    }
                }
                
                // Convertir a número entero
                if (count !== null && count !== undefined) {
                    const numCount = typeof count === 'string' 
                        ? parseInt(count, 10) 
                        : Math.floor(Number(count));
                    
                    console.log("📊 Número de usuarios procesado:", numCount);
                    setTotalUsers(numCount);
                } else {
                    console.warn("⚠️ No se pudo obtener el número de usuarios de la respuesta:", data);
                    // Fallback: mostrar un número por defecto si no se puede obtener
                    setTotalUsers(0);
                }
            })
            .catch((error) => {
                console.error("❌ Error al cargar estadísticas:", error);
                console.error("❌ Detalles del error:", error.response?.data || error.message);
                console.error("❌ URL intentada:", error.config?.url || "N/A");
                
                // Si es un error de red (servidor no disponible), mostrar 0 como fallback
                if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                    console.warn("⚠️ Servidor no disponible. Mostrando fallback.");
                    setTotalUsers(0); // Mostrar 0 en lugar de null para que se muestre "+0"
                } else {
                    // Para otros errores, mantener null
                    setTotalUsers(null);
                }
            })
            .finally(() => {
                setIsLoadingStats(false);
            });
    }, []);

    // Función para formatear el número de usuarios
    const formatUserCount = (count: number | null): string => {
        if (count === null) return ""; // No mostrar nada mientras carga o si hay error
        // Asegurar que sea un número entero
        const num = Math.floor(Number(count));
        if (num >= 1000) {
            // Si es exactamente un múltiplo de 1000, mostrar sin decimales
            if (num % 1000 === 0) {
                return `+${num / 1000}k`;
            }
            return `+${(num / 1000).toFixed(1)}k`;
        }
        return `+${num}`;
    };

    return (
        <div className="flex-1 w-full flex flex-col bg-[#0A0F1C] text-slate-100 font-sans selection:bg-blue-500/30">
            {/* Header / Navbar? (opcional si hay, el diseño no muestra navbar arriba de esto) */}

            <main className="flex-1 flex flex-col items-center">
                {/* Hero Section */}
                <section className="w-full max-w-6xl mx-auto px-6 py-20 lg:py-32 flex flex-col lg:flex-row items-center justify-between gap-16">
                    {/* Left Column */}
                    <div className="flex-1 space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wider uppercase">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Útil para cualquier entorno académico
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
                            Reduce tu <span className="text-blue-500">estrés académico</span> hoy
                        </h1>

                        <p className="text-lg text-slate-400 leading-relaxed max-w-xl">
                            Organiza tus estudios, evita conflictos y alcanza tus metas con nuestra herramienta de planificación inteligente diseñada específicamente para universitarios.
                        </p>

                        <div className="flex items-center gap-4 pt-4">
                            <div className="flex -space-x-3">
                                <img className="w-10 h-10 rounded-full border-2 border-[#0F172A]" src="https://i.pravatar.cc/100?img=1" alt="Student" />
                                <img className="w-10 h-10 rounded-full border-2 border-[#0F172A]" src="https://i.pravatar.cc/100?img=2" alt="Student" />
                                <img className="w-10 h-10 rounded-full border-2 border-[#0F172A]" src="https://i.pravatar.cc/100?img=3" alt="Student" />
                                <div className="w-10 h-10 rounded-full border-2 border-[#0F172A] bg-blue-600 flex items-center justify-center text-xs font-bold text-white z-10">
                                    {isLoadingStats ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        formatUserCount(totalUsers)
                                    )}
                                </div>
                            </div>
                            <span className="text-sm text-slate-400 font-medium">
                                Estudiantes ya están organizados
                            </span>
                        </div>
                    </div>

                    {/* Right Column - Auth Card */}
                    <div className="w-full max-w-md bg-[#1E293B]/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-2xl">
                        <div className="space-y-6">
                            {/* Register Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">¿Eres nuevo acá?</h3>
                                </div>
                                <p className="text-sm text-slate-400">Crea tu cuenta con nosotros</p>
                                <Button
                                    onClick={() => navigate('/registro')}
                                    className="w-full bg-white hover:bg-slate-100 text-[#0F172A] font-bold h-12 rounded-xl border-none"
                                >
                                    Registrarse Gratis <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>

                            <div className="relative py-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-700/50"></div>
                                </div>
                            </div>

                            {/* Login Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">¡Qué bueno verte de nuevo!</h3>
                                </div>
                                <p className="text-sm text-slate-400">Inicia sesión ahorita mismo</p>
                                <Button
                                    onClick={() => navigate('/login')}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl border-none"
                                >
                                    Iniciar Sesión <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="w-full border-t border-slate-800/50"></div>

                {/* Features Section */}
                <section className="w-full bg-[#111827] py-24 px-6">
                    <div className="max-w-6xl mx-auto flex flex-col items-center">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-3xl lg:text-4xl font-bold text-white">
                                ¿Qué puedo hacer con StudyFlow?
                            </h2>
                            <div className="h-1 w-16 bg-blue-600 rounded-full mx-auto"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                            {/* Card 1 */}
                            <div className="bg-[#1E293B]/40 border border-slate-800 rounded-2xl p-8 flex flex-col gap-6 relative overflow-hidden group hover:border-slate-700 transition-colors">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                <div className="bg-blue-500 w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-xl font-bold text-white">Alertas de Límite Diario</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        Define un <span className="text-blue-400">tiempo límite</span> de estudio diario y recibe alertas para descansar.
                                    </p>
                                </div>
                                <div className="mt-auto pt-6 flex flex-col items-center gap-4">
                                    <div className="bg-[#0F172A] border border-slate-800 px-6 py-3 rounded-xl shadow-inner w-full text-center">
                                        <span className="text-2xl font-black text-white tracking-widest">25:00</span>
                                        <div className="h-1 w-12 bg-blue-600 rounded-full mx-auto mt-2"></div>
                                    </div>
                                    <div className="bg-[#0F172A] p-3 rounded-full border border-slate-800 text-blue-500">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-[#1E293B]/40 border border-slate-800 rounded-2xl p-8 flex flex-col gap-6 relative overflow-hidden group hover:border-slate-700 transition-colors">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                <div className="bg-orange-500 w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-xl font-bold text-white">Detección de Conflictos</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        Te avisaremos si planeas más de <span className="text-orange-400 font-medium">6 horas</span> seguidas sin descanso.
                                    </p>
                                </div>
                                <div className="mt-auto pt-6 flex flex-col items-center gap-4">
                                    <div className="bg-[#0F172A] border border-slate-800 px-4 py-3 rounded-xl shadow-inner w-full flex items-center justify-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                                        <span className="text-xs font-bold text-slate-300">Conflicto detectado</span>
                                    </div>
                                    <div className="bg-[#0F172A] p-3 rounded-full border border-slate-800 text-orange-500">
                                        <Bell className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>

                            {/* Card 3 */}
                            <div className="bg-[#1E293B]/40 border border-slate-800 rounded-2xl p-8 flex flex-col gap-6 relative overflow-hidden group hover:border-slate-700 transition-colors">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                <div className="bg-emerald-500 w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-xl font-bold text-white">Seguimiento de Progreso</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        Visualiza tu progreso real en cada materia y celebra tus logros académicos.
                                    </p>
                                </div>
                                <div className="mt-auto pt-6 flex flex-col items-center gap-4">
                                    <div className="bg-[#0F172A] border border-slate-800 p-4 rounded-xl shadow-inner w-full flex items-end justify-center gap-2 h-[68px]">
                                        <div className="w-3 bg-emerald-900 rounded-t-sm h-[30%]"></div>
                                        <div className="w-3 bg-emerald-700 rounded-t-sm h-[50%]"></div>
                                        <div className="w-3 bg-emerald-500 rounded-t-sm h-[80%]"></div>
                                        <div className="w-3 bg-emerald-400 rounded-t-sm h-full"></div>
                                    </div>
                                    <div className="bg-[#0F172A] p-3 rounded-full border border-slate-800 text-emerald-500">
                                        <BarChart2 className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="w-full border-t border-slate-800/50"></div>

                {/* Video Section */}
                <section className="w-full bg-[#0F172A] py-24 px-6 flex flex-col items-center">
                    <div className="text-center mb-12 space-y-4 max-w-2xl mx-auto">
                        <h2 className="text-3xl lg:text-4xl font-bold text-white">
                            ¿Cómo planear con StudyFlow?
                        </h2>
                        <p className="text-slate-400">
                            Para comenzar a usar nuestras herramientas de planificación, es necesario autenticarte en la plataforma.
                        </p>
                    </div>

                    <div className="w-full max-w-4xl aspect-[16/9] rounded-2xl relative overflow-hidden bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-slate-800 shadow-2xl group cursor-pointer flex items-center justify-center">
                        <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(59,130,246,0.1),_transparent_40%)]"></div>

                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                                <Play className="w-6 h-6 text-white ml-1" fill="currentColor" />
                            </div>
                        </div>
                    </div>

                    <p className="mt-6 text-sm text-slate-500 text-center">
                        Dale clic al video de abajo para ver una breve demo
                    </p>
                </section>
            </main>
        </div>
    );
}
