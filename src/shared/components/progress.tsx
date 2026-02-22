import { cn } from "@/shared/utils/utils";

interface ProgressProps {
  value: number;
  className?: string;
}

export const Progress = ({ value, className }: ProgressProps) => {
  const isDestructive = className?.includes('[&>div]:bg-destructive');
  return (
    <div className={cn("w-full bg-secondary rounded-full overflow-hidden h-2", className)}>
      <div
        className={cn(
          "h-full transition-all duration-300 rounded-full",
          isDestructive ? "bg-destructive" : "bg-primary"
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
};
