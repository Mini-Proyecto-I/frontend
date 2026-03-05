import { AlertTriangle } from "lucide-react";

export default function ConflictWidget() {
    return (
        <article className="bg-[#FFF8EC] dark:bg-[#3d2919] border border-orange-200 dark:border-orange-900/50 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="bg-orange-100 dark:bg-orange-500/20 text-orange-500 p-2.5 rounded-xl border border-orange-200/50 flex-shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-orange-500 dark:text-orange-400 mb-2 mt-0.5">Conflict Detected</h3>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
                        <span className="font-bold text-slate-800 dark:text-slate-100">Nov 14th</span> is overloaded with <span className="font-bold text-slate-800 dark:text-slate-100">11 hours</span> of planned work across all subjects.
                    </p>

                    <div className="flex items-center gap-3">
                        <button className="flex-1 bg-orange-200/50 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 text-orange-600 dark:text-orange-300 font-bold py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer text-center">
                            View Schedule
                        </button>
                        <button className="flex-1 bg-transparent hover:bg-orange-100 dark:hover:bg-orange-900/20 text-slate-500 dark:text-slate-400 font-bold py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer text-center">
                            Auto-Reschedule
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}
