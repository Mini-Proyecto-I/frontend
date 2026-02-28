import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/dialog";
import { Loader2 } from "lucide-react";

interface DeletingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetLabel: "actividad" | "subtarea";
}

export default function DeletingDialog({
  open,
  onOpenChange,
  targetLabel,
}: DeletingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
              <Loader2 className="h-5 w-5 text-red-600 dark:text-red-400 animate-spin" />
            </div>
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Eliminando tu {targetLabel}...
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 pt-2">
            Eliminando tu {targetLabel}, espera unos segundos.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

