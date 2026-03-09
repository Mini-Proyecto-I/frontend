import * as React from 'react';
import { useState } from 'react';
import { NavLink } from '@/app/NavLink';
import { useAuth } from '@/app/authContext';
import { Plus, Menu, X, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/avatar';
import { Button } from '@/shared/components/button';
import { useNavigate, useLocation } from 'react-router-dom';

export function AppHeader() {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const displayName = user?.name || "Estudiante";
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const scrollOrNavigateToSection = (target: 'features' | 'help') => {
        const isOnLanding = location.pathname === '/';
        const targetId = target === 'features' ? 'landing-features' : 'landing-help-video';

        if (isOnLanding) {
            const el = document.getElementById(targetId);
            if (el) {
                const headerOffset = 80;
                const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = elementPosition - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth',
                });
                return;
            }
        }

        navigate('/', { state: { scrollTo: target } });
    };

    return (
        <header className="sticky top-0 z-50 w-full flex flex-col bg-[#0A0F1C] border-b border-slate-800">
            <div className="flex items-center justify-between px-4 sm:px-8 h-16 sm:h-20 w-full">
                {/* Left side: Logo */}
                <div
                    className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0"
                    onClick={() => navigate(isAuthenticated ? '/hoy' : '/')}
                >
                    <img src="/favicon2.svg" alt="StudyFLow" className="w-8 h-8 object-contain" />
                    <span className="text-xl font-bold tracking-tight text-white hover:text-slate-200 transition-colors hidden min-[380px]:block">StudyFLow</span>
                </div>

                {/* Right side: Nav Items & Profile based on auth */}
                <div className="flex items-center gap-4 sm:gap-6">
                    {isAuthenticated ? (
                        <>
                            {/* Desktop Nav */}
                            <nav className="items-center gap-4 hidden md:flex">
                                <NavLink
                                    to="/hoy"
                                    className="px-5 py-2 rounded-full font-bold text-sm transition-all text-slate-400 hover:text-slate-200"
                                    activeClassName="!bg-white !text-blue-600 shadow-md"
                                >
                                    Hoy
                                </NavLink>
                                <NavLink
                                    to="/progreso"
                                    className="px-5 py-2 rounded-full font-bold text-sm transition-all text-slate-400 hover:text-slate-200"
                                    activeClassName="!bg-white !text-blue-600 shadow-md"
                                >
                                    Progreso
                                </NavLink>
                            </nav>

                            <Button
                                onClick={() => navigate('/crear')}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold px-3 sm:px-5 py-2 shadow-lg shadow-blue-600/20 gap-1.5 sm:gap-2 h-auto hidden sm:flex shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Nueva Actividad</span>
                            </Button>

                            <div className="relative z-50 hidden sm:block">
                                <Avatar
                                    className="h-10 w-10 shrink-0 border border-slate-800 bg-orange-200/20 flex cursor-pointer transition-transform hover:scale-105"
                                    onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
                                    title="Mi perfil"
                                >
                                    <AvatarImage src={`https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png`} />
                                    <AvatarFallback className="bg-[#1E293B] text-slate-300 font-semibold text-base">
                                        {displayName.split(' ').map((n) => n[0]).join('')}
                                    </AvatarFallback>
                                </Avatar>

                                {isAvatarMenuOpen && (
                                    <>
                                        {/* Overlay para cerrar al hacer clic afuera */}
                                        <div
                                            className="fixed inset-0 z-[-1]"
                                            onClick={() => setIsAvatarMenuOpen(false)}
                                        />

                                        <div className="absolute right-0 mt-3 w-56 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl overflow-hidden py-1">
                                            <div className="px-4 py-3 border-b border-slate-800/60 mb-1">
                                                <p className="text-sm font-bold text-white truncate">{displayName}</p>
                                                <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">ESTUDIANTE</p>
                                            </div>
                                            <button
                                                className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-slate-800/50 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                                                onClick={() => {
                                                    setIsAvatarMenuOpen(false);
                                                    navigate('/logout');
                                                }}
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Cerrar sesión
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Desktop Nav Unauthenticated */}
                            <nav className="items-center gap-6 text-sm font-semibold text-slate-400 hidden md:flex">
                                <button onClick={() => scrollOrNavigateToSection('features')} className="hover:text-white transition-colors">
                                    Funcionalidades
                                </button>
                                <button onClick={() => scrollOrNavigateToSection('help')} className="hover:text-white transition-colors">
                                    Ayuda
                                </button>
                            </nav>

                            <div className="items-center gap-3 hidden md:flex shrink-0">
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/registro')}
                                    className="bg-[#1E293B] hover:bg-slate-700 text-white font-bold px-5 py-2 h-auto rounded-lg border-slate-700 hover:text-white"
                                >
                                    Registrarse
                                </Button>
                                <Button
                                    onClick={() => navigate('/login')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 h-auto rounded-lg shadow-lg shadow-blue-600/20 border-none"
                                >
                                    Iniciar Sesión
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Mobile Menu Toggle Button */}
                    <button
                        className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        onClick={toggleMenu}
                        aria-label="Toggle menu"
                    >
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                    {/* Compact Avatar for Mobile when Authenticated (Always visible, even when menu closed to easily identify user) */}
                    {isAuthenticated && !isMenuOpen && (
                        <div className="sm:hidden block">
                            <Avatar className="h-8 w-8 shrink-0 border border-slate-800 bg-orange-200/20">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}&backgroundColor=d97706`} />
                                <AvatarFallback className="bg-[#1E293B] text-slate-300 font-semibold text-xs text-center flex items-center justify-center">
                                    {displayName.split(' ').map((n) => n[0]).join('')}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            {isMenuOpen && (
                <div className="md:hidden flex flex-col bg-[#0A0F1C] border-t border-slate-800 px-4 py-4 gap-4 pb-6 shadow-2xl">
                    {isAuthenticated ? (
                        <>
                            <div className="flex items-center gap-3 px-2 mb-2">
                                <Avatar className="h-10 w-10 shrink-0 border border-slate-800 bg-orange-200/20">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}&backgroundColor=d97706`} />
                                    <AvatarFallback className="bg-[#1E293B] text-slate-300 font-semibold">
                                        {displayName.split(' ').map((n) => n[0]).join('')}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-white font-bold">{displayName}</p>
                                    <p className="text-xs text-slate-400">Estudiante</p>
                                </div>
                            </div>
                            <nav className="flex flex-col gap-2 border-t border-slate-800 pt-4">
                                <NavLink
                                    to="/hoy"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="px-4 py-3 rounded-xl font-bold text-sm transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800 flex items-center"
                                    activeClassName="!bg-white !text-blue-600 shadow-md"
                                >
                                    Hoy
                                </NavLink>
                                <NavLink
                                    to="/progreso"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="px-4 py-3 rounded-xl font-bold text-sm transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800 flex items-center"
                                    activeClassName="!bg-white !text-blue-600 shadow-md"
                                >
                                    Progreso
                                </NavLink>
                            </nav>
                            <Button
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    navigate('/crear');
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold px-5 py-3 shadow-lg shadow-blue-600/20 gap-2 h-auto w-full flex justify-center mt-2"
                            >
                                <Plus className="w-5 h-5" />
                                Nueva Actividad
                            </Button>

                            <Button
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    navigate('/logout');
                                }}
                                className="bg-transparent border border-slate-800 hover:bg-red-500/10 text-red-500 hover:border-red-500/50 rounded-xl font-bold px-5 py-3 gap-2 h-auto w-full flex justify-center mt-2 shadow-none"
                            >
                                <LogOut className="w-5 h-5" />
                                Cerrar sesión
                            </Button>
                        </>
                    ) : (
                        <>
                            <nav className="flex flex-col gap-2">
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        scrollOrNavigateToSection('features');
                                    }}
                                    className="px-4 py-3 text-left font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    Funcionalidades
                                </button>
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        scrollOrNavigateToSection('help');
                                    }}
                                    className="px-4 py-3 text-left font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    Ayuda
                                </button>
                            </nav>
                            <div className="flex flex-col gap-3 mt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        navigate('/registro');
                                    }}
                                    className="bg-[#1E293B] hover:bg-slate-700 text-white font-bold px-5 py-3 h-auto rounded-xl border-slate-700"
                                >
                                    Registrarse
                                </Button>
                                <Button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        navigate('/login');
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 h-auto rounded-xl shadow-lg border-none"
                                >
                                    Iniciar Sesión
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </header>
    );
}
