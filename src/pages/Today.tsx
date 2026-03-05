import React, { useState, useMemo, useEffect } from "react";
import { parseISO, startOfDay, differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, AlertCircle, Clock, Search, X, Loader2, CalendarClock, Info, CheckCircle2, Calendar, Pencil, Check, ChevronUp, ChevronDown } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useHoy } from "@/features/today/hooks/useHoy";
import { useAuth } from "@/app/authContext";
import { patchSubtask } from "@/api/services/subtack";
import { queryCache } from "@/lib/queryCache";
import { Input } from "@/shared/components/input";
import { Button } from "@/shared/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/select";

function getGreeting(name: string) {
  const hour = new Date().getHours();
  // Name usually could have spaces, just take first name
  const firstName = name.split(" ")[0];
  if (hour >= 5 && hour < 12) return `¡Buen día, ${firstName}!`;
  if (hour >= 12 && hour < 19) return `¡Buenas tardes, ${firstName}!`;
  return `¡Buenas noches, ${firstName}!`;
}

function formatHours(hoursStr: string | number) {
  const h = parseFloat(String(hoursStr));
  if (h < 1) return `${Math.round(h * 60)} MIN`;
  return `${h.toFixed(1)}H`;
}

function getRelativeDateLabel(targetDateStr: string) {
  if (!targetDateStr) return "";
  const date = startOfDay(parseISO(targetDateStr));
  const today = startOfDay(new Date());
  const diffDays = differenceInDays(date, today);

  if (diffDays === 0) return "HOY";
  if (diffDays === -1) return "AYER";
  if (diffDays === 1) return "MAÑANA";
  if (diffDays < -1) return `HACE ${Math.abs(diffDays)} DÍAS`;
  return format(date, "EEEE", { locale: es }).toUpperCase();
}



export default function Today() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [limitHours, setLimitHours] = useState(() => {
    const saved = window.localStorage.getItem("studyLimitHours");
    return saved ? parseFloat(saved) : 6;
  });
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [tempLimit, setTempLimit] = useState(limitHours.toString());
  const [welcomeLimit, setWelcomeLimit] = useState("6");

  const handleSaveLimit = () => {
    let val = parseFloat(tempLimit);
    if (isNaN(val)) val = limitHours;
    if (val < 0.5) val = 0.5;
    if (val > 24) val = 24;

    setLimitHours(val);
    setTempLimit(val.toString());
    window.localStorage.setItem("studyLimitHours", val.toString());
    setIsEditingLimit(false);
  };

  useEffect(() => {
    if (location.state?.justRegistered) {
      setShowWelcomeModal(true);
      // Limpiar state al montarse el componente para evitar que aparezca de nuevo al refrescar
      navigate("/hoy", { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const [filters, setFilters] = useState({
    status: "",
    course: "",
    days_ahead: 7
  });
  const [search, setSearch] = useState("");
  const hasActiveFilters = filters.course || filters.status || search;

  const {
    vencidas,
    para_hoy,
    proximas,
    total_vencidas,
    total_para_hoy,
    total_proximas,
    courses,
    loading,
    error,
    refetch,
    setData,
    setTiempoData,
    tiempoData,
    refetchTiempo
  } = useHoy(filters);

  const handleToggleSubtask = async (activityId: string, subtaskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "DONE" ? "PENDING" : "DONE";

    queryCache.invalidate('activities');
    // ── Optimistic local UI update ──────────────────────────────────────────
    setData((prev: any) => {
      const updateList = (list: any[]) =>
        list.map(item => item.id === subtaskId ? { ...item, status: newStatus } : item);

      return {
        ...prev,
        vencidas: updateList(prev.vencidas),
        para_hoy: updateList(prev.para_hoy),
        proximas: updateList(prev.proximas),
      };
    });

    setTiempoData((prev: any[]) =>
      prev.map(item => item.id === subtaskId ? { ...item, status: newStatus } : item) as any
    );

    try {
      await patchSubtask(activityId, subtaskId, { status: newStatus });
      // Update the tiempo card silently in background
      refetchTiempo();
    } catch (err) {
      console.error(err);
      // Revert optimistic update if the API call failed
      setData((prev: any) => {
        const revertList = (list: any[]) =>
          list.map(item => item.id === subtaskId ? { ...item, status: currentStatus } : item);

        return {
          ...prev,
          vencidas: revertList(prev.vencidas),
          para_hoy: revertList(prev.para_hoy),
          proximas: revertList(prev.proximas),
        };
      });

      setTiempoData((prev: any[]) =>
        prev.map(item => item.id === subtaskId ? { ...item, status: currentStatus } : item) as any
      );
    }
  };

  const handleClearFilters = () => {
    setFilters({ status: "", course: "", days_ahead: 7 });
    setSearch("");
  };

  const doneHours = useMemo(() => {
    if (!tiempoData) return 0;
    return tiempoData
      .filter((t: any) => t.status === "DONE")
      .reduce((acc: number, t: any) => acc + parseFloat(t.estimated_hours || 0), 0);
  }, [tiempoData]);

  const pendingHours = useMemo(() => {
    if (!tiempoData) return 0;
    return tiempoData
      .filter((t: any) => t.status !== "DONE")
      .reduce((acc: number, t: any) => acc + parseFloat(t.estimated_hours || 0), 0);
  }, [tiempoData]);

  const totalHours = doneHours + pendingHours;
  const isOverloaded = totalHours > limitHours;

  // Filter lists locally by search query
  const searchFilter = (item: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return item.title.toLowerCase().includes(s) || (item.activity?.course?.name || "").toLowerCase().includes(s);
  };

  const filteredVencidas = vencidas.filter(searchFilter);
  const filteredParaHoy = para_hoy.filter(searchFilter);
  const filteredProximas = proximas.filter(searchFilter);

  const pendingTodayCount = filteredParaHoy.filter((t: any) => t.status !== "DONE").length;

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-10 pb-10 mt-6 lg:mt-10">
      {/* HEADER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Welcome Card */}
        <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 lg:p-8 flex items-center justify-between shadow-xl shadow-black/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="space-y-2 relative z-10">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white">
              <span className="text-blue-500">{getGreeting(user?.name || "Estudiante")}</span> Aquí encuentras tus tareas para hoy
            </h1>
            <p className="text-slate-400 font-medium">
              Tienes {pendingTodayCount === 1 ? '1 tarea pendiente' : `${pendingTodayCount} tareas pendientes`} hoy
            </p>
          </div>
          <div className="bg-blue-600/10 p-4 rounded-2xl hidden sm:flex border border-blue-500/20 relative z-10">
            <CalendarDays className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        {/* Capacity Card */}
        <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 lg:p-8 flex flex-col justify-center shadow-xl shadow-black/20 space-y-4">
          <div className="flex items-start justify-between w-full">
            <div className="space-y-1 w-full">
              <div className="flex items-center gap-2">
                {isOverloaded ? (
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                ) : (
                  <CalendarClock className="w-5 h-5 text-slate-400 hidden" />
                )}
                <h2 className="text-slate-300 font-bold text-lg">Tiempo de estudio / día</h2>
              </div>

              <div className="flex items-center justify-between w-full mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}h</span>
                  <span className="text-slate-400 font-bold text-lg">/ {limitHours}h</span>
                </div>

                {!isEditingLimit ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingLimit(true)}
                    className="h-9 px-4 rounded-xl bg-slate-800/50 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 transition-all border border-slate-700/50"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 bg-slate-900 border border-blue-500/30 rounded-xl p-1.5 animate-in zoom-in-95 duration-200">
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      value={tempLimit}
                      onChange={(e) => setTempLimit(e.target.value)}
                      className="w-20 h-9 text-center bg-[#111827] border-slate-700 focus-visible:ring-1 focus-visible:ring-blue-500 text-white font-bold text-base rounded-lg"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveLimit}
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-md font-medium"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Guardar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-3 mt-1">
            <div className="h-4 bg-slate-800 rounded-full w-full overflow-hidden flex">
              {isOverloaded ? (
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all duration-500"
                  style={{ width: '100%' }}
                />
              ) : (
                <>
                  <div
                    className="h-full bg-emerald-400 transition-all duration-500"
                    style={{ width: `${Math.min((doneHours / limitHours) * 100, 100)}%` }}
                  />
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${Math.min((pendingHours / limitHours) * 100, 100 - (doneHours / limitHours) * 100)}%` }}
                  />
                </>
              )}
            </div>
            {isOverloaded && (
              <p className="text-orange-500 text-[13px] font-semibold flex items-center gap-1.5 break-words">
                <AlertCircle className="w-4 h-4 shrink-0" />
                El tiempo total de tus tareas excede tu tiempo de estudio límite ¡Acomodemos las tareas!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* FILTER BAR SECTION */}
      <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4 shadow-lg shadow-black/10 flex flex-col gap-4">
        <div className="flex items-center gap-2 px-1">
          <Search className="w-5 h-5 text-blue-500" />
          <h2 className="text-white font-bold text-lg">Filtros</h2>
          {hasActiveFilters && (
            <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg font-semibold">
              Filtrado por:
              {filters.course && " Curso"}
              {filters.status && " Estado"}
              {search && " Busqueda"}
            </span>
          )
          }
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Buscar por nombre</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar tarea..."
                className="w-full pl-12 bg-[#1F2937]/50 border-slate-700/50 focus-visible:ring-blue-500 h-12 rounded-xl text-slate-200 placeholder:text-slate-500 block"
              />
            </div>
          </div>

          <div className="flex w-full md:w-auto gap-3 items-end">
            <div className="relative flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Curso</label>
              <Select
                value={filters.course || "all"}
                onValueChange={(v) => setFilters(prev => ({ ...prev, course: v === "all" ? "" : v }))}
              >
                <SelectTrigger className="w-full md:w-[200px] bg-[#1F2937]/50 border-slate-700/50 text-slate-200 h-12 rounded-xl focus:ring-blue-500 shadow-inner">
                  <SelectValue placeholder="Todos los cursos" />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2937] border-slate-700 text-slate-200 rounded-xl shadow-xl">
                  <SelectItem value="all" className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">Todos los cursos</SelectItem>
                  {courses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()} className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Estado</label>
              <Select
                value={filters.status || "all"}
                onValueChange={(v) => setFilters(prev => ({ ...prev, status: v === "all" ? "" : v }))}
              >
                <SelectTrigger className="w-full md:w-[170px] bg-[#1F2937]/50 border-slate-700/50 text-slate-200 h-12 rounded-xl focus:ring-blue-500 shadow-inner">
                  <SelectValue placeholder="Cualquier estado" />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2937] border-slate-700 text-slate-200 rounded-xl shadow-xl">
                  <SelectItem value="all" className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">Cualquier estado</SelectItem>
                  <SelectItem value="PENDING" className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">Pendiente</SelectItem>
                  <SelectItem value="DONE" className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">Completado</SelectItem>
                  <SelectItem value="POSTPONED" className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">Pospuesto</SelectItem>
                  <SelectItem value="WAITING" className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">En Espera</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="h-12 border-slate-700/50 bg-[#1F2937]/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl mb-[1px]"
            >
              <X className="w-4 h-4 mr-2" /> Limpiar
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-slate-400 font-medium tracking-wide">Cargando tus tareas de hoy...</p>
        </div>
      ) : (
        /* 3 COLUMNS SECTION */
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-6">
          {/* COLUMN 1: VENCIDAS */}
          <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-black/20 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2 px-2">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h3 className="text-xl font-black tracking-widest text-[#94A3B8] uppercase">Vencidas</h3>
            </div>
            {filteredVencidas.map((item: any, idx: number) => (
              <TaskCard
                key={item.id}
                item={item}
                badge={idx === 0 ? "MÁS ANTIGUA" : null}
                theme="red"
                onToggle={() => handleToggleSubtask(item.activity.id, item.id, item.status)}
              />
            ))}
            {filteredVencidas.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center mt-4">
                <CheckCircle2 className="w-14 h-14 text-slate-600/50 mb-4" strokeWidth={1.5} />
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[200px]">
                  {search || filters.course || (filters.status && filters.status !== 'PENDING')
                    ? "No hay tareas atrasadas que coincidan con los filtros aplicados."
                    : "No tienes tareas atrasadas. ¡Buen trabajo!"}
                </p>
              </div>
            )}
          </div>

          {/* COLUMN 2: PARA HOY */}
          <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-black/20 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2 px-2">
              <CalendarDays className="w-6 h-6 text-emerald-400" />
              <h3 className="text-xl font-black tracking-widest text-[#94A3B8] uppercase">Para Hoy</h3>
            </div>
            {filteredParaHoy.map((item: any, idx: number) => (
              <TaskCard
                key={item.id}
                item={item}
                badge={idx === 0 ? "LA MÁS CORTA" : null}
                theme="emerald"
                onToggle={() => handleToggleSubtask(item.activity.id, item.id, item.status)}
              />
            ))}
            {filteredParaHoy.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center mt-4">
                <CheckCircle2 className="w-16 h-16 text-slate-600/50 mb-4" strokeWidth={1.5} />
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[260px] mb-6 shadow-sm">
                  {filters.status === 'DONE'
                    ? "No tienes tareas completadas para hoy. Revisa en Pendientes"
                    : search || filters.course || (filters.status && filters.status !== 'PENDING')
                      ? "No hay tareas para hoy que coincidan con los filtros aplicados."
                      : "No tienes tareas para hoy. Disfruta tu descanso o añade alguna tarea"}
                </p>
                {!(search || filters.course || (filters.status && filters.status !== 'PENDING')) && (
                  <Button
                    onClick={() => navigate('/crear')}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl px-5 py-2.5 transition-colors shadow-lg shadow-blue-500/20"
                  >
                    + Nueva actividad
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* COLUMN 3: PRÓXIMAS */}
          <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-black/20 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2 px-2">
              <CalendarClock className="w-6 h-6 text-blue-500" />
              <h3 className="text-xl font-black tracking-widest text-[#94A3B8] uppercase">Próximas</h3>
            </div>
            {filteredProximas.map((item: any, idx: number) => (
              <TaskCard
                key={item.id}
                item={item}
                badge={idx === 0 ? "MÁS CERCANA" : null}
                theme="blue"
                onToggle={() => handleToggleSubtask(item.activity.id, item.id, item.status)}
              />
            ))}
            {filteredProximas.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center mt-4">
                <Calendar className="w-14 h-14 text-slate-600/50 mb-4" strokeWidth={1.5} />
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[200px]">
                  {search || filters.course || (filters.status && filters.status !== 'PENDING')
                    ? "No hay tareas próximas que coincidan con los filtros aplicados."
                    : "No hay tareas próximas. Todo está al día."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl max-w-[520px] w-full mx-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

            <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-500/10">
              <Info className="w-6 h-6 text-blue-400" />
            </div>

            <h3 className="text-[17px] font-semibold text-white mb-8 tracking-wide">Te encuentras en hoy, aquí podrás ver:</h3>

            <div className="flex flex-col gap-5 text-left w-full mb-8 px-4">
              <div className="flex items-start gap-4">
                <CalendarDays className="w-5 h-5 text-emerald-400 mt-1 shrink-0" />
                <p className="text-emerald-400 text-[15px] font-medium leading-snug">Tus tareas propuestas para hoy y organizadas de menor a mayor tiempo</p>
              </div>
              <div className="flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-red-500 mt-1 shrink-0" />
                <p className="text-red-400 text-[15px] font-medium leading-snug">Tus tareas vencidas de más antiguas a menos antiguas</p>
              </div>
              <div className="flex items-start gap-4">
                <CalendarClock className="w-5 h-5 text-blue-400 mt-1 shrink-0" />
                <p className="text-blue-400 text-[15px] font-medium leading-snug">Tus tareas próximas de más cercanas a más lejanas</p>
              </div>
            </div>

            <p className="text-slate-400 text-[13px] font-medium mb-8 px-4">
              Podrás aplicar filtros de búsqueda por nombre, curso y estado.
            </p>

            <div className="mb-8 w-full px-4">
              <label className="text-sm font-semibold text-slate-300 block mb-3">
                ¿Cuántas horas planeas estudiar al día?
              </label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={welcomeLimit}
                onChange={(e) => setWelcomeLimit(e.target.value)}
                className="w-full h-12 text-center bg-[#1F2937]/50 border-slate-700/50 focus-visible:ring-blue-500 text-white font-bold text-lg rounded-xl"
              />
            </div>

            <Button
              onClick={() => {
                let val = parseFloat(welcomeLimit);
                if (isNaN(val)) val = 6;
                if (val < 0.5) val = 0.5;
                if (val > 24) val = 24;
                setLimitHours(val);
                setTempLimit(val.toString());
                window.localStorage.setItem("studyLimitHours", val.toString());
                setShowWelcomeModal(false);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 h-11 rounded-xl font-bold shadow-lg shadow-blue-600/20 text-sm transition-all w-full sm:w-auto"
            >
              Comenzar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for individual tasks matching the requested UI
function TaskCard({ item, badge, theme, onToggle }: { item: any, badge: string | null, theme: "red" | "emerald" | "blue", onToggle: () => void }) {
  const isDone = item.status === "DONE";
  const courseName = item.activity?.course?.name || "Actividad";
  const title = item.title;

  const themeColors = {
    red: {
      border: "border-red-500/30",
      bg: "bg-red-950/20",
      badge: "bg-red-500 text-white",
      text: "text-red-400",
      icon: "text-red-500/70",
      hover: "hover:border-red-500/50",
      checkbox: "border-red-500 checked:bg-red-500",
    },
    emerald: {
      border: "border-emerald-500/30",
      bg: "bg-[#091E1A]", // Dark emerald bg
      badge: "bg-emerald-400 text-emerald-950",
      text: "text-emerald-400",
      icon: "text-emerald-500/70",
      hover: "hover:border-emerald-500/50",
      checkbox: "border-emerald-500 checked:bg-emerald-500",
    },
    blue: {
      border: "border-blue-500/30",
      bg: "bg-blue-950/20",
      badge: "bg-blue-500 text-white",
      text: "text-blue-400",
      icon: "text-blue-500/70",
      hover: "hover:border-blue-500/50",
      checkbox: "border-blue-500 checked:bg-blue-500",
    }
  };

  const colors = themeColors[theme];

  return (
    <div className={`relative flex flex-col gap-4 border ${colors.border} ${colors.bg} rounded-3xl p-5 w-full transition-all duration-300 ${colors.hover} shadow-lg ${isDone ? 'opacity-50 grayscale' : ''}`}>
      {badge && (
        <div className={`absolute -top-3 left-6 px-3 py-1 font-black text-[10px] tracking-widest uppercase rounded-full ${colors.badge} shadow-lg`}>
          {badge}
        </div>
      )}

      <div className="flex justify-between items-start pt-2">
        <div className="space-y-1 pr-6 flex-1 min-w-0">
          <p className={`font-black text-[10px] tracking-[0.15em] uppercase truncate ${colors.text} filter drop-shadow-md flex items-center gap-2`}>
            <span className="opacity-50">{courseName}</span>
            <span className="opacity-30">•</span>
            <Link to={`/actividad/${item.activity.id}`} className="hover:underline transition-all hover:opacity-100">
              {item.activity?.title || "Actividad"}
            </Link>
          </p>
          <h4 className={`text-lg font-bold ${isDone ? 'text-slate-400 line-through' : 'text-slate-100'} leading-tight tracking-tight pr-4`}>
            {title}
          </h4>
        </div>

        <button
          onClick={onToggle}
          className={`flex-shrink-0 mt-1 w-6 h-6 border-2 rounded cursor-pointer ${colors.checkbox} flex items-center justify-center transition-colors shadow-inner`}
        >
          {isDone && <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
        </button>
      </div>

      <div className="flex justify-between items-center mt-3 pt-4 border-t border-slate-700/30">
        <span className={`text-[11px] font-black tracking-widest uppercase ${colors.text}`}>
          {getRelativeDateLabel(item.target_date)}
        </span>
        <div className={`flex items-center gap-1.5 text-xs font-black tracking-widest uppercase ${colors.text}`}>
          <Clock className={`w-3.5 h-3.5 ${colors.icon}`} />
          {formatHours(item.estimated_hours)}
        </div>
      </div>
    </div>
  );
}
