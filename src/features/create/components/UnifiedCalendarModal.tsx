import React from "react";
import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Loader2, CalendarRange, CalendarCheck, Check, X } from "lucide-react";

export interface UnifiedCalendarTask {
    id: string | number;
    title: string;
    hoursLabel?: string;
    muted?: boolean;
    highlighted?: boolean;
    highlightLabel?: string;
}

export interface UnifiedCalendarDay {
    key: string;
    date: Date;
    disabled: boolean;
    isToday: boolean;
    isSelected: boolean;
    availabilityHours: number;
    actionLabel?: string;
    emphasize?: "today" | "currentTask" | "warning";
    tasks: UnifiedCalendarTask[];
}

interface UnifiedCalendarModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    topBanner?: React.ReactNode;
    loading: boolean;
    weekRangeLabel: string;
    onPrevWeek: () => void;
    onNextWeek: () => void;
    onGoToToday: () => void;
    showMonthPicker: boolean;
    onToggleMonthPicker: () => void;
    monthPickerDate: Date;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    monthPickerWeeks: Date[][];
    onSelectMonthWeek: (weekStart: Date) => void;
    days: UnifiedCalendarDay[];
    onSelectDay: (day: Date) => void;
    selectedDateLabel?: string;
    onConfirm: () => void;
    confirmDisabled: boolean;
    confirmLabel: string;
    confirmLoading?: boolean;
    confirmLoadingLabel?: string;
    zIndexClassName?: string;
}

export default function UnifiedCalendarModal({
    open,
    onClose,
    title,
    subtitle,
    topBanner,
    loading,
    weekRangeLabel,
    onPrevWeek,
    onNextWeek,
    onGoToToday,
    showMonthPicker,
    onToggleMonthPicker,
    monthPickerDate,
    onPrevMonth,
    onNextMonth,
    monthPickerWeeks,
    onSelectMonthWeek,
    days,
    onSelectDay,
    selectedDateLabel,
    onConfirm,
    confirmDisabled,
    confirmLabel,
    confirmLoading = false,
    confirmLoadingLabel = "Guardando...",
    zIndexClassName = "z-[100]",
}: UnifiedCalendarModalProps) {
    if (!open) return null;

    return (
        <div
            className={`fixed inset-0 ${zIndexClassName} flex items-center justify-center bg-black/70 backdrop-blur-sm px-4`}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="w-full max-w-[1180px] bg-[#111827] border border-slate-800 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {topBanner}

                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-800/60">
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">{title}</h3>
                        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 pt-4 pb-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <span className="text-sm font-bold text-white capitalize">{weekRangeLabel}</span>

                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                            <button
                                type="button"
                                onClick={onPrevWeek}
                                className="p-2 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/50 transition-all text-slate-400"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={onNextWeek}
                                className="p-2 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/50 transition-all text-slate-400"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={onToggleMonthPicker}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider ${
                                    showMonthPicker
                                        ? "bg-blue-600 border-blue-500 text-white"
                                        : "bg-slate-800/60 border-slate-700/80 text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 hover:border-blue-500/60"
                                }`}
                            >
                                <CalendarRange className="w-4 h-4" />
                                Seleccionar semana
                            </button>
                            <button
                                type="button"
                                onClick={onGoToToday}
                                className="rounded-xl bg-slate-800/60 border border-slate-700/80 text-slate-200 text-xs font-bold uppercase tracking-widest hover:bg-blue-600/20 hover:text-blue-300 hover:border-blue-500/60 transition-all px-4 py-2"
                            >
                                Hoy
                            </button>
                        </div>
                    </div>
                </div>

                {showMonthPicker && (
                    <div className="px-6 pb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <button
                                    type="button"
                                    onClick={onPrevMonth}
                                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm font-bold text-white capitalize">
                                    {format(monthPickerDate, "MMMM yyyy", { locale: es })}
                                </span>
                                <button
                                    type="button"
                                    onClick={onNextMonth}
                                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-1">
                                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                                    <div key={d} className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider py-1">
                                        {d}
                                    </div>
                                ))}
                            </div>
                            {monthPickerWeeks.map((week, wi) => (
                                <button
                                    key={wi}
                                    type="button"
                                    onClick={() => onSelectMonthWeek(startOfWeek(week[0], { weekStartsOn: 1 }))}
                                    className="grid grid-cols-7 gap-1 w-full rounded-xl py-1 transition-all cursor-pointer hover:bg-slate-800/60 border border-transparent"
                                >
                                    {week.map((day, di) => (
                                        <div key={di} className="text-center text-xs py-1 rounded-lg text-slate-300">
                                            {format(day, "d")}
                                        </div>
                                    ))}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Cargando calendario...</p>
                    </div>
                ) : (
                    <div className="px-4 pb-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                            {days.map((day) => {
                                const hasAvailability = day.availabilityHours > 0;
                                return (
                                    <div key={day.key} className="flex flex-col gap-2 min-h-[320px]">
                                        <button
                                            type="button"
                                            onClick={() => onSelectDay(day.date)}
                                            disabled={day.disabled}
                                            className={`flex flex-col items-center p-3 rounded-2xl border-t-4 transition-all ${
                                                day.disabled
                                                    ? "opacity-35 cursor-not-allowed border-slate-800 bg-slate-800/20"
                                                    : day.isSelected
                                                    ? "bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10 scale-[1.01]"
                                                    : day.emphasize === "currentTask"
                                                    ? "bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/15 cursor-pointer"
                                                    : day.emphasize === "warning"
                                                    ? "bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                                                    : day.isToday || day.emphasize === "today"
                                                    ? "bg-blue-500/10 border-blue-500/60 hover:bg-blue-500/15 cursor-pointer"
                                                    : "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600 cursor-pointer"
                                            }`}
                                        >
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${
                                                day.isSelected
                                                    ? "text-blue-400"
                                                    : day.emphasize === "currentTask"
                                                    ? "text-amber-400"
                                                    : day.isToday
                                                    ? "text-blue-400"
                                                    : "text-slate-400"
                                            }`}>
                                                {format(day.date, "EEE", { locale: es })}
                                            </span>
                                            <span className={`text-lg font-black mt-0.5 ${
                                                day.isSelected
                                                    ? "text-white"
                                                    : day.emphasize === "currentTask"
                                                    ? "text-amber-300"
                                                    : day.isToday
                                                    ? "text-blue-300"
                                                    : "text-slate-200"
                                            }`}>
                                                {format(day.date, "d")}
                                            </span>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Clock className={`w-3 h-3 ${hasAvailability ? "text-emerald-400" : "text-amber-400"}`} />
                                                <span className={`text-[9px] font-bold ${hasAvailability ? "text-emerald-400" : "text-amber-400"}`}>
                                                    {day.availabilityHours % 1 === 0 ? day.availabilityHours : day.availabilityHours.toFixed(1)}h disp.
                                                </span>
                                            </div>
                                            {!day.disabled && day.actionLabel && (
                                                <span className={`mt-1 text-[8px] font-black uppercase tracking-widest ${
                                                    day.actionLabel === "Excede el límite" ? "text-amber-400" : "text-blue-400"
                                                }`}>
                                                    {day.actionLabel}
                                                </span>
                                            )}
                                        </button>

                                        <div className="flex-1 min-h-[140px] max-h-[220px] overflow-y-auto rounded-xl bg-slate-900/40 border border-slate-800/40 p-2 custom-scrollbar-unified">
                                            {day.tasks.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {day.tasks.map((task) => (
                                                        <div
                                                            key={task.id}
                                                            className={`px-2.5 py-2 rounded-xl text-[10px] leading-tight transition-colors ${
                                                                task.highlighted
                                                                    ? "bg-amber-500/20 border border-amber-500/40 text-amber-200"
                                                                    : task.muted
                                                                    ? "bg-slate-800/30 text-slate-500 line-through"
                                                                    : "bg-slate-800/50 text-slate-300"
                                                            }`}
                                                        >
                                                            <span className="font-semibold line-clamp-2">{task.title}</span>
                                                            {(task.hoursLabel || task.highlightLabel) && (
                                                                <div className="mt-1 flex items-center justify-between gap-2">
                                                                    {task.hoursLabel ? (
                                                                        <span className="text-[9px] text-slate-400 font-bold">{task.hoursLabel}</span>
                                                                    ) : <span />}
                                                                    {task.highlightLabel && (
                                                                        <span className="text-[9px] text-amber-400 font-bold">{task.highlightLabel}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-center">
                                                    <div className="w-10 h-10 rounded-full bg-slate-800/40 border border-slate-700/40 flex items-center justify-center mb-2">
                                                        <CalendarCheck className="w-6 h-6 text-blue-500/80" strokeWidth={1.6} />
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 font-bold italic uppercase tracking-wider">Sin actividades</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/60">
                    <div className="text-xs text-slate-400">
                        {selectedDateLabel ? <span>{selectedDateLabel}</span> : <span className="italic">Selecciona un día en el calendario</span>}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 text-xs font-bold hover:bg-slate-800 hover:text-slate-300 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={confirmDisabled || confirmLoading}
                            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                                !confirmDisabled && !confirmLoading
                                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 cursor-pointer"
                                    : "bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                            }`}
                        >
                            {confirmLoading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    {confirmLoadingLabel}
                                </>
                            ) : (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    {confirmLabel}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar-unified::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar-unified::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar-unified::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                .custom-scrollbar-unified { scrollbar-width: thin; scrollbar-color: #334155 transparent; }
            `}</style>
        </div>
    );
}
