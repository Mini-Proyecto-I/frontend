import ActivityDetailHeader from "./ActivityDetailHeader";
import ActivityProgressCard from "./ActivityProgressCard";
import StudyPlanSection from "./StudyPlanSection";
import ScheduleContext from "./ScheduleContext";

interface ActivityDetailViewProps {
  activityId?: string;
}

export default function ActivityDetailView({ activityId }: ActivityDetailViewProps) {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 font-display min-h-screen overflow-y-auto p-6 md:p-10 lg:p-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-8 space-y-8">
          <ActivityDetailHeader />
          <ActivityProgressCard />
          <StudyPlanSection />
        </section>

        <section className="lg:col-span-4 space-y-6">
          <ScheduleContext />
        </section>
      </div>
    </div>
  );
}
