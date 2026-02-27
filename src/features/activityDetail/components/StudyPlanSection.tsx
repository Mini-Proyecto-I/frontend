import { useState } from "react";
import { Plus } from "lucide-react";
import SubtaskItem from "./SubtaskItem";

type FilterOption = "mostrar" | "fecha";

export default function StudyPlanSection() {
  const [activeFilter, setActiveFilter] = useState<FilterOption>("mostrar");

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Plan de estudio
        </h3>
        <div className="flex items-center gap-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveFilter("mostrar")}
            className={`cursor-pointer transition-colors ${
              activeFilter === "mostrar"
                ? "text-blue-500 dark:text-blue-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Mostrar Todo
          </button>
          <span className="text-slate-500 dark:text-slate-500">|</span>
          <button
            type="button"
            onClick={() => setActiveFilter("fecha")}
            className={`cursor-pointer transition-colors ${
              activeFilter === "fecha"
                ? "text-blue-500 dark:text-blue-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Ordenar por fecha
          </button>
        </div>
      </div>

      <SubtaskItem
        title="Repasar límites y continuidad"
        date="10 nov"
        hours="2h"
        completed
      />
      <SubtaskItem
        title="Practicar derivadas"
        date="12 nov"
        hours="3h"
        isActive
        todayBadge
      />
      <SubtaskItem
        title="Examen modelo 2022"
        date="14 nov"
        hours="4h"
      />
      <SubtaskItem
        title="Repaso de integrales"
        date="14 nov"
        hours="3h"
      />

      <button
        type="button"
        className="cursor-pointer w-full py-3.5 rounded-xl border-2 border-dashed border-slate-500 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-100 dark:bg-slate-800/60 hover:bg-blue-500/10 dark:hover:bg-blue-500/10 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-2.5 font-semibold"
      >
        <Plus className="size-5" />
        <span>Añadir otra subtarea</span>
      </button>
    </section>
  );
}
