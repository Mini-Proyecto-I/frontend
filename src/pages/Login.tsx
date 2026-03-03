import React, { useState } from "react";
import { Button } from "@/shared/components/button";
import { Input } from "@/shared/components/input";
import { Label } from "@/shared/components/label";
import { Mail, Lock, ArrowRight, GraduationCap } from "lucide-react";
import { useAuth } from "@/app/authContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const { login, isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (!loading && isAuthenticated) {
            navigate("/hoy", { replace: true });
        }
    }, [isAuthenticated, loading, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError("Por favor, completa todos los campos.");
            return;
        }

        try {
            setIsLoading(true);
            await login(email, password);
            navigate("/"); // redirige al home /hoy que maneja app routing
        } catch (err: any) {
            // Se puede mostrar el error devuelto por la API
            const status = err?.response?.status;
            if (status === 401) {
                setError("Correo o contraseña incorrectos.");
            } else {
                setError("Ocurrió un error al iniciar sesión. Intenta de nuevo.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex text-slate-100 bg-[#111827]">
            {/* Panel Izquierdo */}
            <div className="hidden lg:flex w-[40%] relative flex-col justify-between p-12 overflow-hidden">
                {/* Capa oscura de sobreposición */}
                <div
                    className="absolute inset-0 z-0 bg-[#0F172A]/90 mix-blend-multiply"
                />
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center opacity-40"
                    style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2000&auto=format&fit=crop")' }}
                />

                {/* Contenido superior - Logo */}
                <div className="relative z-10 flex items-center gap-2">
                    <div className="bg-blue-500 p-2 rounded-lg">
                        <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">StudyPlan</span>
                </div>

                {/* Contenido inferior - Cita */}
                <div className="relative z-10 max-w-lg">
                    <h1 className="text-4xl font-bold leading-tight text-white mb-6">
                        "La educación es el arma más poderosa que puedes usar para cambiar el mundo."
                    </h1>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px w-12 bg-blue-600"></div>
                        <span className="text-slate-300 font-medium">Nelson Mandela</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed text-sm">
                        Únete a miles de estudiantes que ya están organizando su futuro
                        académico con nuestras herramientas de planificación inteligente.
                    </p>
                </div>
            </div>

            {/* Panel Derecho */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 bg-[#111827]">
                <div className="w-full max-w-md space-y-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Iniciar sesión</h2>
                        <p className="text-slate-400">
                            Bienvenido de vuelta. Inicia sesión para continuar.
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}
                        <div className="space-y-4">
                            {/* Correo */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300 text-sm font-medium">
                                    Correo universitario
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="ejemplo@universidad.edu.co"
                                        className="pl-10 bg-[#1F2937] border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-500 h-12 rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Contraseña */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                                        Contraseña
                                    </Label>
                                    <a href="#" className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors">
                                        ¿Olvidaste tu contraseña?
                                    </a>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="pl-10 bg-[#1F2937] border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-500 h-12 rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-base font-medium flex gap-2"
                        >
                            {isLoading ? "Iniciando sesión..." : "Iniciar sesión"} <ArrowRight className="h-4 w-4" />
                        </Button>
                    </form>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#111827] px-4 text-slate-500">
                                O inicia sesión con
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button type="button" variant="outline" className="h-12 bg-[#1F2937] border-slate-700 hover:bg-slate-800 hover:text-white rounded-xl">
                            <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </Button>
                        <Button type="button" variant="outline" className="h-12 bg-[#1F2937] border-slate-700 hover:bg-slate-800 hover:text-white rounded-xl">
                            <svg className="w-5 h-5 mr-1 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.938 5.858-5.938 1.573 0 2.71.182 2.71.182v3.08h-1.638c-1.346 0-1.897.641-1.897 1.851v1.405h3.401l-.478 3.667h-2.923v7.98H9.101z" />
                            </svg>
                            Facebook
                        </Button>
                    </div>

                    <div className="text-center mt-6 text-slate-400 text-sm">
                        ¿No tienes una cuenta?{' '}
                        <a href="/registro" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
                            Regístrate
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
