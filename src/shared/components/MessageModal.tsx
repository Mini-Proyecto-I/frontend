import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/dialog";
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
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onOpenChange(false);
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-12 w-12 text-[#10B981]" />;
      case "error":
        return <XCircle className="h-12 w-12 text-[#EF4444]" />;
      case "warning":
        return <AlertCircle className="h-12 w-12 text-[#F59E0B]" />;
      default:
        return null;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case "success":
        return "bg-[#10B981] hover:bg-[#10B981]/90 text-white";
      case "error":
        return "bg-[#EF4444] hover:bg-[#EF4444]/90 text-white";
      case "warning":
        return "bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white";
      default:
        return "bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#1E293B] border-border">
        <DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {getIcon()}
            <DialogTitle className="text-xl text-foreground text-center">
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            {message}
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleConfirm}
            className={`${getButtonColor()} w-full sm:w-auto`}
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
