import { useState, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/tooltip";

interface InfoTooltipProps {
  text: string;
}

const InfoTooltip = ({ text }: InfoTooltipProps) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Prevenir que el tooltip se active automáticamente al montar
  useEffect(() => {
    // Resetear el estado cuando el componente se monta
    setOpen(false);
  }, []);

  const handleMouseEnter = () => {
    // Limpiar cualquier timeout existente
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Activar el tooltip solo después de un delay cuando el usuario realmente hace hover
    hoverTimeoutRef.current = setTimeout(() => {
      setOpen(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpen(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Tooltip 
      open={open} 
      onOpenChange={(newOpen) => {
        // Solo permitir cambios manuales si el usuario está haciendo hover
        // Esto previene activaciones automáticas
        if (!newOpen || buttonRef.current?.matches(':hover')) {
          setOpen(newOpen);
        }
      }} 
      delayDuration={0}
    >
      <TooltipTrigger asChild>
        <button
          ref={buttonRef}
          type="button"
          className="ml-1 inline-flex items-center"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          tabIndex={-1}
        >
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[300px] bg-[#1E293B] text-foreground border border-border text-sm shadow-lg normal-case whitespace-normal"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
};

export default InfoTooltip;
