import { cn } from "@/shared/utils/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/card";
import { Progress } from "@/shared/components/progress";

interface CapacityCardProps {
  totalHours: number;
  dailyLimit: number;
  progressPercent: number;
  isOverloaded: boolean;
}

export const CapacityCard = ({ totalHours, dailyLimit, progressPercent, isOverloaded }: CapacityCardProps) => {
  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Capacidad de estudio</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1 mb-3">
          <span className={cn('text-3xl font-bold transition-colors', isOverloaded ? 'text-destructive' : 'text-primary')}>
            {totalHours}
          </span>
          <span className="text-muted-foreground text-sm">/ {dailyLimit}h límite</span>
        </div>
        <Progress value={progressPercent} className={cn('h-2.5 rounded-full', isOverloaded && '[&>div]:bg-destructive')} />
        {isOverloaded && (
          <p className="text-xs text-destructive mt-2">
            {(totalHours - dailyLimit).toFixed(1)}h por encima de tu límite diario
          </p>
        )}
      </CardContent>
    </Card>
  );
};
