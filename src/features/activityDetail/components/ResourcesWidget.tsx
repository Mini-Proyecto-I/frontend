import { Download, ExternalLink, Plus } from "lucide-react";

export default function ResourcesWidget() {
    return (
        <article className="bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-slate-700/50">
            <h3 className="font-bold text-white mb-4 text-lg">Resources</h3>

            <div className="space-y-3">
                {/* Resource Item 1 */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                            <span className="font-black text-xs">PDF</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Syllabus.pdf</p>
                            <p className="text-[11px] text-slate-400 font-medium">2.4 MB</p>
                        </div>
                    </div>
                    <Download className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                </div>

                {/* Resource Item 2 */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <ExternalLink className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Online Calculator</p>
                            <p className="text-[11px] text-slate-400 font-medium">External Link</p>
                        </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                </div>
            </div>

            <button className="w-full mt-4 py-3 rounded-xl border border-dashed border-slate-600 hover:border-slate-500 hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-2 text-sm text-slate-400 font-semibold cursor-pointer">
                <Plus className="w-4 h-4" />
                + Add Resource
            </button>
        </article>
    );
}
