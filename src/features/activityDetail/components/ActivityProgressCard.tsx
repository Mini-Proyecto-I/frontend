interface ActivityProgressCardProps {
  progressPercent?: number;
  timeLeft?: string;
  totalEffort?: string;
  status?: string;
}

export default function ActivityProgressCard({
  progressPercent = 43,
  timeLeft = "12 Days",
  totalEffort = "15 Hours",
  status = "In Progress",
}: ActivityProgressCardProps) {
  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row shadow-lg sm:items-center justify-between gap-8 sm:gap-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* Circle Chart */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-10 sm:gap-14 w-full z-10">
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              className="text-slate-700/50"
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="9"
              fill="transparent"
            />
            <circle
              className="text-blue-500"
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="9"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 - (progressPercent / 100) * (2 * Math.PI * 40)}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
            <span className="text-3xl font-bold text-white tracking-tight">
              {progressPercent}%
            </span>
            <span className="text-xs font-semibold text-slate-400">Done</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-6 sm:gap-10">
          <div>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-2">ESTADO</p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'Finalizado' ? 'bg-green-400' : status === 'Vencido' ? 'bg-red-500' : 'bg-yellow-400'}`}></span>
              <p className={`text-lg lg:text-2xl font-bold whitespace-nowrap ${status === 'Finalizado' ? 'text-green-500' : status === 'Vencido' ? 'text-red-500' : 'text-yellow-500'}`}>{status}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-2">TIEMPO RESTANTE</p>
            <p className="text-lg lg:text-2xl font-bold text-white">{timeLeft}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-2">ESFUERZO TOTAL</p>
            <p className="text-lg lg:text-2xl font-bold text-white">{totalEffort}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
