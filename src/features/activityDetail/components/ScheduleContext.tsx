interface ScheduleEvent {
  time: string;
  title: string;
  isFromActivity?: boolean;
}

interface ScheduleContextProps {
  date?: string;
  events?: ScheduleEvent[];
}

const defaultEvents: ScheduleEvent[] = [
  { time: "09:00 - 11:00", title: "Laboratorio de Física" },
  { time: "13:00 - 16:00", title: "Borrador ensayo de Historia" },
  {
    time: "Estimado 4h",
    title: "Examen modelo 2022",
    isFromActivity: true,
  },
];

export default function ScheduleContext({
  date = "14 nov",
  events = defaultEvents,
}: ScheduleContextProps) {
  const formattedDate = date.toUpperCase();
  return (
    <article className="bg-white dark:bg-[#1e2433] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          Agenda del día
        </h3>
        <span className="text-xs text-slate-500 uppercase font-semibold tracking-wide">{formattedDate}</span>
      </div>

      <div className="space-y-4 relative">
        <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-300 dark:bg-slate-700" />

        {events.map((event, index) => (
          <div key={index} className="relative pl-10">
            <div
              className={`absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 ${
                event.isFromActivity
                  ? "bg-blue-500 border-blue-500 ring-2 ring-blue-500/30"
                  : "bg-slate-400 dark:bg-slate-600 border-slate-300 dark:border-slate-700"
              }`}
            />
            <div
              className={`p-3 rounded-lg border ${
                event.isFromActivity
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50"
                  : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
              }`}
            >
              <p
                className={`text-xs font-semibold mb-1 ${
                  event.isFromActivity 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {event.time}
              </p>
              <p
                className={`text-sm ${
                  event.isFromActivity
                    ? "font-bold text-blue-700 dark:text-blue-300"
                    : "font-medium text-slate-700 dark:text-slate-300"
                }`}
              >
                {event.title}
              </p>
              {event.isFromActivity && (
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1.5">
                  Desde esta actividad
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
