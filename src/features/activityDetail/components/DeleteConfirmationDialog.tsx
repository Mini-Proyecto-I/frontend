import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/dialog";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName?: string;
  isActivity?: boolean;
}

export default function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  isActivity = false,
}: DeleteConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              ¿Estás seguro?
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 pt-2">
            {isActivity ? (
              <>
                Se eliminará la actividad <span className="font-semibold text-slate-900 dark:text-white">{itemName || "esta actividad"}</span> de forma definitiva.
                <br />
                <br />
                Esta acción no se puede deshacer.
              </>
            ) : (
              <>
                Se eliminará la subtarea <span className="font-semibold text-slate-900 dark:text-white">{itemName || "esta subtarea"}</span> de forma definitiva.
                <br />
                <br />
                Esta acción no se puede deshacer.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition-colors shadow-sm"
          >
            Eliminar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
