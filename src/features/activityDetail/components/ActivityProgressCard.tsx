interface ActivityProgressCardProps {
  progressPercent?: number;
  status?: string;
  timeLeft?: string;
  totalEffort?: string;
}

export default function ActivityProgressCard({
  progressPercent = 43,
  status = "En progreso",
  timeLeft = "12 días",
  totalEffort = "15 horas",
}: ActivityProgressCardProps) {
  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <section className="bg-white dark:bg-[#1e2433] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              className="text-slate-200 dark:text-slate-700"
              cx="50"
              cy="50"
              r="42"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              className="text-primary"
              cx="50"
              cy="50"
              r="42"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {progressPercent}%
            </span>
            <span className="text-xs text-slate-500">Completado</span>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center sm:text-left w-full">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
              Estado
            </p>
            <p className="text-lg font-medium text-amber-400 flex items-center justify-center sm:justify-start gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {status}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
              Tiempo restante
            </p>
            <p className="text-lg font-medium dark:text-white">{timeLeft}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
              Esfuerzo total
            </p>
            <p className="text-lg font-medium dark:text-white">{totalEffort}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
