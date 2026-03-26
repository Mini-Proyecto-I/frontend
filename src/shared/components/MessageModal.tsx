import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/shared/components/button";

interface MessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "success" | "error" | "warning";
  title: string;
  message: string;
  onConfirm?: () => void;
}

export const MessageModal = ({
  open,
  onOpenChange,
  type,
  title,
  message,
  onConfirm,
}: MessageModalProps) => {
  if (!open) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onOpenChange(false);
  };

  const config = {
    success: {
      icon: <CheckCircle2 className="w-7 h-7 text-emerald-400" />,
      iconBg: "bg-emerald-400/10 border-emerald-400/20",
      button: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20",
    },
    error: {
      icon: <XCircle className="w-7 h-7 text-red-400" />,
      iconBg: "bg-red-500/10 border-red-500/20",
      button: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20",
    },
    warning: {
      icon: <AlertCircle className="w-7 h-7 text-amber-400" />,
      iconBg: "bg-amber-400/10 border-amber-400/20",
      button: "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20",
    },
  }[type];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-[480px] bg-[#111827] border border-slate-800 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 sm:p-8 relative">
          {/* Close button */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon + Title */}
          <div className="flex flex-col items-center text-center gap-4 mb-6">
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${config.iconBg}`}>
              {config.icon}
            </div>
            <h3 className="text-xl font-extrabold text-white tracking-tight">
              {title}
            </h3>
          </div>

          {/* Message */}
          <p
            className="text-sm text-slate-400 text-center leading-relaxed mb-8"
            dangerouslySetInnerHTML={{ __html: message }}
          />

          {/* Button */}
          <Button
            onClick={handleConfirm}
            className={`w-full h-11 rounded-xl font-bold text-sm transition-all ${config.button}`}
          >
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
};