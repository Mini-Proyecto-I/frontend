import React, { useState } from "react";
import { Button } from "@/shared/components/button";
import { Input } from "@/shared/components/input";
import { Checkbox } from "@/shared/components/checkbox";
import { Label } from "@/shared/components/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/components/select";
import { ArrowRight, GraduationCap, AlertCircle, Eye, EyeOff, CheckCircle } from "lucide-react";
import { register } from "@/api/services/auth";
import { useAuth } from "@/app/authContext";
import { useNavigate } from "react-router-dom";

export default function Register() {
    const [name, setName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // UI states
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [globalError, setGlobalError] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Field errors
    const [errors, setErrors] = useState<{
        name?: string;
        lastName?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
    }>({});

    // Touched states for real-time validation feedback
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

    // Email helper state (parte local + dominio o modo personalizado)
    const [emailMode, setEmailMode] = useState<"preset" | "custom">("preset");
    const [emailLocalPart, setEmailLocalPart] = useState("");
    const [emailDomain, setEmailDomain] = useState("@gmail.com");
    const [customEmail, setCustomEmail] = useState("");

    // Password validation rules
    const passwordHasMinLength = password.length >= 8;
    const passwordHasUppercase = /[A-ZÁÉÍÓÚÑ]/.test(password);
    const passwordHasNumber = /\d/.test(password);
    const isPasswordValid = passwordHasMinLength && passwordHasUppercase && passwordHasNumber;

    // Confirm password real-time validation
    const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
    const showConfirmFeedback = confirmPasswordTouched && confirmPassword.length > 0;

    const { login, isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (!authLoading && isAuthenticated && !isLoading && !showSuccessModal) {
            navigate("/hoy", { replace: true });
        }
    }, [isAuthenticated, authLoading, navigate, isLoading, showSuccessModal]);

    const validate = () => {
        const newErrors: typeof errors = {};

        if (!name.trim()) newErrors.name = "Es obligatorio poner tu nombre";
        if (!lastName.trim()) newErrors.lastName = "Es obligatorio poner tu apellido";
        if (!email.trim()) newErrors.email = "Es obligatorio poner un correo";
        if (!password) {
            newErrors.password = "Es obligatorio poner una contraseña";
        } else {
            if (!passwordHasMinLength) {
                newErrors.password = "La contraseña debe tener mínimo 8 caracteres";
            } else if (!passwordHasUppercase) {
                newErrors.password = "La contraseña debe incluir al menos una mayúscula";
            } else if (!passwordHasNumber) {
                newErrors.password = "La contraseña debe incluir al menos un número";
            }
        }
        if (!confirmPassword) newErrors.confirmPassword = "Debes confirmar tu contraseña";
        if (password && confirmPassword && password !== confirmPassword) {
            newErrors.confirmPassword = "La contraseña no coincide con la anterior";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGlobalError("");

        if (!validate()) return;

        try {
            setIsLoading(true);
            const fullName = `${name.trim()} ${lastName.trim()}`;
            await register({ name: fullName, email, password });
            await login(email, password);
            setShowSuccessModal(true);
        } catch (err: any) {
            const apiError = err?.response?.data;
            if (apiError) {
                if (apiError.email) {
                    setErrors((prev) => ({ ...prev, email: apiError.email[0] }));
                } else if (apiError.password) {
                    setErrors((prev) => ({ ...prev, password: apiError.password[0] }));
                } else {
                    setGlobalError("Ocurrió un error al registrarse. Revisa tus datos e intenta de nuevo.");
                }
            } else {
                setGlobalError("No se pudo conectar al servidor.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="flex-1 w-full flex text-slate-100 bg-[#0A0F1C] overflow-hidden max-h-[calc(100vh-8px)]"
            style={{
                fontFamily: '"Lexend", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
        >
            {/* Panel Izquierdo */}
            <div className="hidden lg:flex w-[40%] relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border-r border-[#1E293B]">
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center opacity-60 mix-blend-overlay"
                    style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2000&auto=format&fit=crop")' }}
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

                <div className="w-full max-w-xl space-y-10 lg:mt-0 mt-12">
                    <div>
                        <h2 className="text-4xl font-extrabold text-white mb-2">Crea tu cuenta</h2>
                    </div>

                    <form className="space-y-8" onSubmit={handleSubmit} noValidate>
                        {globalError && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg text-sm">
                                {globalError}
                            </div>
                        )}

                        {/* SECTION 1 */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="h-px w-8 bg-blue-600/50"></div>
                                <h3 className="text-blue-500 font-semibold text-sm uppercase tracking-wider">Dinos cómo te llamas</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-slate-300 text-xs font-semibold">Nombre</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                                        }}
                                        placeholder="Ej: Juan"
                                        className={`bg-[#0F172A] border ${errors.name ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-800 focus-visible:ring-blue-500'} text-slate-100 placeholder:text-slate-500 h-12 rounded-xl`}
                                    />
                                    {errors.name && (
                                        <p className="text-red-500 text-xs flex items-center mt-1">
                                            <AlertCircle className="w-3 h-3 mr-1" /> {errors.name}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName" className="text-slate-300 text-xs font-semibold">Apellido</Label>
                                    <Input
                                        id="lastName"
                                        value={lastName}
                                        onChange={(e) => {
                                            setLastName(e.target.value);
                                            if (errors.lastName) setErrors(prev => ({ ...prev, lastName: undefined }));
                                        }}
                                        placeholder="Ej: Pérez"
                                        className={`bg-[#0F172A] border ${errors.lastName ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-800 focus-visible:ring-blue-500'} text-slate-100 placeholder:text-slate-500 h-12 rounded-xl`}
                                    />
                                    {errors.lastName && (
                                        <p className="text-red-500 text-xs flex items-center mt-1">
                                            <AlertCircle className="w-3 h-3 mr-1" /> {errors.lastName}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2 */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="h-px w-8 bg-blue-600/50"></div>
                                <h3 className="text-blue-500 font-semibold text-sm uppercase tracking-wider">Datos para tu acceso</h3>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300 text-xs font-semibold">Correo electrónico</Label>

                                {emailMode === "preset" ? (
                                    <div className="flex gap-0">
                                        <Input
                                            id="email"
                                            type="text"
                                            autoComplete="off"
                                            value={emailLocalPart}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\s/g, "");
                                                setEmailLocalPart(value);
                                                const composed = value ? `${value}${emailDomain}` : "";
                                                setEmail(composed);
                                                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                                            }}
                                            placeholder="Ej: ejemplo.email"
                                            className={`flex-1 bg-[#0F172A] border ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-800 focus-visible:ring-blue-500'} text-slate-100 placeholder:text-slate-500 h-12 rounded-l-xl rounded-r-none`}
                                        />
                                        <Select
                                            value={emailDomain}
                                            onValueChange={(value) => {
                                                if (value === "custom") {
                                                    const currentFull = emailLocalPart ? `${emailLocalPart}${emailDomain}` : "";
                                                    setCustomEmail(currentFull);
                                                    setEmail(currentFull);
                                                    setEmailMode("custom");
                                                    return;
                                                }
                                                setEmailDomain(value);
                                                const composed = emailLocalPart ? `${emailLocalPart}${value}` : "";
                                                setEmail(composed);
                                                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                                            }}
                                        >
                                            <SelectTrigger
                                                className={`w-56 bg-[#0F172A] border ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-slate-800 focus:ring-blue-500'} text-slate-100 h-12 rounded-r-xl rounded-l-none border-l-0`}
                                            >
                                                <SelectValue placeholder="@gmail.com" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#020617] border border-slate-800 text-slate-100">
                                                <SelectItem value="@gmail.com">@gmail.com</SelectItem>
                                                <SelectItem value="@correounivalle.edu.co">@correounivalle.edu.co</SelectItem>
                                                <SelectItem value="@outlook.com">@outlook.com</SelectItem>
                                                <SelectItem value="custom">Añadir...</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <Input
                                        id="email"
                                        type="email"
                                        value={customEmail}
                                        onChange={(e) => {
                                            const value = e.target.value.trim();
                                            setCustomEmail(value);
                                            setEmail(value);
                                            if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                                        }}
                                        placeholder="Ej: ejemplo.email@ejemplo.com"
                                        className={`bg-[#0F172A] border ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-800 focus-visible:ring-blue-500'} text-slate-100 placeholder:text-slate-500 h-12 rounded-xl`}
                                    />
                                )}

                                {errors.email && (
                                    <p className="text-red-500 text-xs flex items-center mt-1">
                                        <AlertCircle className="w-3 h-3 mr-1" /> {errors.email}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-slate-300 text-xs font-semibold">Contraseña</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setPassword(value);
                                                if (!passwordTouched) setPasswordTouched(true);
                                                if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                                            }}
                                            placeholder="Ej: Contraseña123"
                                            className={`bg-[#0F172A] border ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-800 focus-visible:ring-blue-500'} text-slate-100 placeholder:text-slate-500 h-12 rounded-xl pr-10`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-red-500 text-xs flex items-center mt-1">
                                            <AlertCircle className="w-3 h-3 mr-1" /> {errors.password}
                                        </p>
                                    )}
                                    <div className="text-xs mt-2 space-y-1 px-1">
                                        <p
                                            className={`flex items-center gap-2 ${
                                                !passwordTouched || password.length === 0
                                                    ? "text-slate-500"
                                                    : passwordHasMinLength
                                                        ? "text-emerald-400"
                                                        : "text-red-400"
                                            }`}
                                        >
                                            <span
                                                className={`w-2 h-2 rounded-full ${
                                                    !passwordTouched || password.length === 0
                                                        ? "bg-slate-600"
                                                        : passwordHasMinLength
                                                            ? "bg-emerald-400"
                                                            : "bg-red-400"
                                                }`}
                                            />
                                            Mínimo 8 caracteres
                                        </p>
                                        <p
                                            className={`flex items-center gap-2 ${
                                                !passwordTouched || password.length === 0
                                                    ? "text-slate-500"
                                                    : passwordHasUppercase
                                                        ? "text-emerald-400"
                                                        : "text-red-400"
                                            }`}
                                        >
                                            <span
                                                className={`w-2 h-2 rounded-full ${
                                                    !passwordTouched || password.length === 0
                                                        ? "bg-slate-600"
                                                        : passwordHasUppercase
                                                            ? "bg-emerald-400"
                                                            : "bg-red-400"
                                                }`}
                                            />
                                            Incluye una mayúscula
                                        </p>
                                        <p
                                            className={`flex items-center gap-2 ${
                                                !passwordTouched || password.length === 0
                                                    ? "text-slate-500"
                                                    : passwordHasNumber
                                                        ? "text-emerald-400"
                                                        : "text-red-400"
                                            }`}
                                        >
                                            <span
                                                className={`w-2 h-2 rounded-full ${
                                                    !passwordTouched || password.length === 0
                                                        ? "bg-slate-600"
                                                        : passwordHasNumber
                                                            ? "bg-emerald-400"
                                                            : "bg-red-400"
                                                }`}
                                            />
                                            Incluye un número
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-slate-300 text-xs font-semibold">Confirmar contraseña</Label>
                                    <div className="relative">
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setConfirmPassword(value);
                                                if (!confirmPasswordTouched) setConfirmPasswordTouched(true);
                                                if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                                            }}
                                            placeholder="Ej: Contraseña123"
                                            className={`bg-[#0F172A] border ${
                                                showConfirmFeedback
                                                    ? passwordsMatch
                                                        ? "border-emerald-500 focus-visible:ring-emerald-500"
                                                        : "border-red-500 focus-visible:ring-red-500"
                                                    : errors.confirmPassword
                                                        ? "border-red-500 focus-visible:ring-red-500"
                                                        : "border-slate-800 focus-visible:ring-blue-500"
                                            } text-slate-100 placeholder:text-slate-500 h-12 rounded-xl pr-10`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {errors.confirmPassword ? (
                                        <p className="text-red-500 text-xs flex items-center mt-1">
                                            <AlertCircle className="w-3 h-3 mr-1" /> {errors.confirmPassword}
                                        </p>
                                    ) : showConfirmFeedback && (
                                        <p
                                            className={`text-xs flex items-center mt-1 ${
                                                passwordsMatch ? "text-emerald-400" : "text-red-500"
                                            }`}
                                        >
                                            {passwordsMatch ? (
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                            ) : (
                                                <AlertCircle className="w-3 h-3 mr-1" />
                                            )}
                                            {passwordsMatch ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-base font-bold shadow-lg shadow-blue-600/20"
                            >
                                {isLoading ? "Creando..." : "Crear Cuenta"}
                            </Button>
                        </div>
                    </form>

                    <div className="text-center mt-8 pb-8 text-slate-400 text-sm">
                        ¿Ya tienes una cuenta?{' '}
                        <a href="/login" className="text-blue-500 hover:text-blue-400 font-semibold transition-colors">
                            Inicia sesión aquí
                        </a>
                    </div>
                </div>
            </div>

            {/* Loading Modal */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#111827] border border-slate-800 rounded-3xl p-10 flex flex-col items-center text-center shadow-2xl max-w-md w-full mx-4">
                        <div className="w-12 h-12 rounded-full border-[3px] border-slate-700 border-t-blue-500 animate-spin mb-6"></div>
                        <h3 className="text-2xl font-bold text-white mb-2">Estamos creando tu usuario</h3>
                        <p className="text-slate-400 text-sm font-medium">pronto podrás iniciar</p>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#111827] border border-slate-800 rounded-3xl p-10 flex flex-col items-center text-center shadow-2xl max-w-sm w-full mx-4">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">¡Cuenta creada!</h3>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8">
                            Ya puedes iniciar a planear tu vida académica con StudyFlow.
                        </p>
                        <Button
                            onClick={() => navigate("/hoy", { state: { justRegistered: true } })}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-base font-bold shadow-lg shadow-blue-600/20"
                        >
                            Empezar ahora
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
