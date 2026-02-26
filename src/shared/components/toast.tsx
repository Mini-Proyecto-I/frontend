import { useEffect, useState, type ReactElement } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/shared/utils/utils";

interface ToastProps {
  message: string;
  type: "success" | "error";
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast = ({ message, type, isVisible, onClose, duration = 3000 }: ToastProps) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300 ease-out",
        type === "success"
          ? "bg-[#1E293B] border-[#10B981] text-white"
          : "bg-[#1E293B] border-[#EF4444] text-white",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
      )}
    >
      <div className="flex items-center gap-3">
        {type === "success" ? (
          <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
        ) : (
          <XCircle className="h-5 w-5 text-[#EF4444]" />
        )}
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="ml-2 rounded-md p-1 hover:bg-white/10 transition-colors"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

interface UseToastReturn {
  showToast: (message: string, type: "success" | "error") => void;
  ToastComponent: () => ReactElement | null;
}

export const useToast = (): UseToastReturn => {
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    isVisible: boolean;
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast((prev) => prev ? { ...prev, isVisible: false } : null);
  };

  const ToastComponent = () => {
    if (!toast) return null;
    return (
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    );
  };

  return { showToast, ToastComponent };
};
