import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/shared/components/button";
import { MessageModal } from "@/shared/components/MessageModal";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  itemName?: string;
  isActivity?: boolean;
  successTitle?: string;
  successMessage?: string;
}

export default function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  isActivity = false,
  successTitle,
  successMessage,
}: DeleteConfirmationDialogProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeletedSuccess, setShowDeletedSuccess] = useState(false);

  const modalVisible = open || showDeletedSuccess;

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (open && !wasOpen) {
      setShowDeletedSuccess(false);
      setIsDeleting(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && modalRef.current) {
      modalRef.current.focus();
    }
  }, [open]);

  if (!modalVisible) return null;

  const handleClose = () => {
    if (isDeleting) return;
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
      setShowDeletedSuccess(true);
    } catch {
      // El caller muestra el error; mantener el modal de confirmación abierto
    } finally {
      setIsDeleting(false);
    }
  };

  const title = isActivity ? "Eliminar actividad" : "Eliminar subtarea";
  const defaultSuccessTitle = isActivity ? "Actividad eliminada" : "Tarea eliminada";
  const defaultSuccessMessage = isActivity
    ? `La actividad <strong>${itemName || "seleccionada"}</strong> se eliminó correctamente.`
    : `La subtarea <strong>${itemName || "seleccionada"}</strong> se eliminó correctamente y ya no aparecerá en tu plan.`;

  const confirmModal =
    open && !showDeletedSuccess ? (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div
          ref={modalRef}
          tabIndex={-1}
          role="alertdialog"
          aria-modal="true"
          aria-label={title}
          className="w-full max-w-[560px] bg-[#111827] border border-slate-800 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden pointer-events-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-6 sm:p-7 relative">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer disabled:opacity-50 z-10"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                {isActivity ? (
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                ) : (
                  <Trash2 className="w-6 h-6 text-red-400" />
                )}
              </div>
              <div className="pr-8">
                <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {title}
                </h3>
                <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                  {isActivity ? (
                    <>
                      ¿Estás seguro de que quieres eliminar la actividad{" "}
                      {itemName ? (
                        <span className="text-red-300 font-semibold">"{itemName}"</span>
                      ) : (
                        "seleccionada"
                      )}
                      ? Esta acción no se puede deshacer.
                    </>
                  ) : (
                    <>
                      ¿Estás seguro de que quieres eliminar la subtarea{" "}
                      <span className="text-red-300 font-semibold">
                        "{itemName || "esta tarea"}"
                      </span>
                      ? Esta acción no se puede deshacer.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  onClick={handleClose}
                  disabled={isDeleting}
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirm}
                  className="h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  return createPortal(
    <Fragment>
      {confirmModal}
      <MessageModal
        open={showDeletedSuccess}
        onOpenChange={(next) => {
          if (!next) {
            setShowDeletedSuccess(false);
            onOpenChange(false);
          }
        }}
        type="success"
        title={successTitle ?? defaultSuccessTitle}
        message={successMessage ?? defaultSuccessMessage}
        overlayClassName="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      />
    </Fragment>,
    document.body
  );
}
