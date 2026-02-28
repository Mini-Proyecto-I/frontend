import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/dialog";

interface ActivityDeletedSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityName: string;
}

export default function ActivityDeletedSuccessDialog({
  open,
  onOpenChange,
  activityName,
}: ActivityDeletedSuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Actividad eliminada
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 pt-2">
            La actividad{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {activityName}
            </span>{" "}
            se ha eliminado correctamente.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
