import React, { useState } from "react";
import { Button } from "@/shared/components/button";
import { Input } from "@/shared/components/input";
import { Label } from "@/shared/components/label";
import { AlertCircle, Eye, EyeOff, GraduationCap, CheckCircle } from "lucide-react";
import { useAuth } from "@/app/authContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // UI states
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const { login, isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (!loading && isAuthenticated && !isLoading && !showSuccessModal) {
            navigate("/hoy", { replace: true });
        }
    }, [isAuthenticated, loading, navigate, isLoading, showSuccessModal]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(false);

        if (!email || !password) {
            setError(true);
            return;
        }

        try {
            setIsLoading(true);
            await login(email, password);
            setIsLoading(false);
            setShowSuccessModal(true);
            setTimeout(() => {
                navigate("/hoy", { replace: true });
            }, 2000);
        } catch (err: any) {
            setError(true);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex text-slate-100 bg-[#0A0F1C]">
            {/* Panel Izquierdo */}
            <div className="hidden lg:flex w-[40%] relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border-r border-[#1E293B]">
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center opacity-60 mix-blend-overlay"
                    style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2000&auto=format&fit=crop")' }}
                />

                {/* Back Link */}
                <div className="relative z-10">
                    <button onClick={() => navigate(-1)} className="flex items-center text-sm font-medium text-slate-300 hover:text-white transition-colors">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Volver
                    </button>
                </div>

                {/* Text Bottom */}
                <div className="relative z-10 mt-auto pt-24 text-center">
                    <h1 className="text-4xl lg:text-5xl font-black leading-tight text-white drop-shadow-lg">
                        Optimiza tu tiempo<br />
                        de estudio con<br />
                        inteligencia.
                    </h1>
                </div>
            </div>

            {/* Panel Derecho */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 bg-[#0A0F1C]">
                {/* Header (Logo & Nav links simulating topnav) */}
                <div className="absolute top-0 right-0 left-0 lg:left-[40%] flex items-center justify-between p-6">
                    <div className="flex items-center gap-2 lg:hidden">
                        <GraduationCap className="h-6 w-6 text-blue-500" />
                        <span className="font-bold">StudyFlow</span>
                    </div>
                    <div className="hidden lg:block"></div>
                </div>

                <div className="w-full max-w-lg space-y-8 lg:mt-0 mt-12">
                    <div>
                        <h2 className="text-4xl font-extrabold text-white mb-2">Bienvenido de nuevo</h2>
                        <p className="text-blue-500 font-semibold">
                            Ingresa tus datos para continuar
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                        {error && (
                            <div className="bg-red-500/10 border border-red-900/50 text-slate-200 px-4 py-4 rounded-xl text-sm flex gap-3 shadow-lg shadow-red-500/5 items-start">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <p className="leading-relaxed">
                                    No pudimos encontrar una cuenta con esos datos.<br />
                                    Revisa que tu correo y contraseña estén bien escritos.
                                </p>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Correo */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300 text-xs font-semibold">
                                    Correo electrónico
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="usuario@ejemplo.com"
                                    className={`bg-[#0F172A] border ${error ? 'border-red-500/50' : 'border-slate-800 focus-visible:ring-blue-500'} text-slate-100 placeholder:text-slate-500 h-12 rounded-xl`}
                                />
                            </div>

                            {/* Contraseña */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-slate-300 text-xs font-semibold">
                                        Contraseña
                                    </Label>
                                    <a href="#" className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors">
                                        ¿Olvidaste tu contraseña?
                                    </a>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="fakepassword"
                                        className={`bg-[#0F172A] border ${error ? 'border-red-500/50' : 'border-slate-800 focus-visible:ring-blue-500'} text-slate-100 placeholder:text-slate-500 h-12 rounded-xl pr-10`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-base font-bold shadow-lg shadow-blue-600/20"
                            >
                                {isLoading ? "Iniciando..." : "Iniciar Sesión"}
                            </Button>
                        </div>
                    </form>

                    <div className="text-center mt-8 pb-8 text-slate-400 text-sm">
                        ¿No tienes una cuenta?{' '}
                        <a href="/registro" className="text-blue-500 hover:text-blue-400 font-semibold transition-colors">
                            Regístrate aquí
                        </a>
                    </div>
                </div>
            </div>

            {/* Loading Modal */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#111827] border border-slate-800 rounded-3xl p-10 flex flex-col items-center text-center shadow-2xl max-w-sm w-full mx-4">
                        <div className="w-12 h-12 rounded-full border-[3px] border-slate-700 border-t-blue-500 animate-spin mb-6"></div>
                        <h3 className="text-xl font-bold text-white mb-2">Estamos confirmando que seas tú</h3>
                        <p className="text-slate-400 text-sm font-medium">Un momento por favor...</p>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#111827] border border-slate-800 rounded-3xl p-10 flex flex-col items-center text-center shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">¡Ingreso exitoso!</h3>
                        <p className="text-slate-400 text-sm leading-relaxed mb-2 font-medium">
                            Ya puedes comenzar a planear tu vida académica
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
