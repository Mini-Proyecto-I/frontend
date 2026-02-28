import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/shared/components/card";
import { Button } from "@/shared/components/button";

export const EmptyState = () => {
  const navigate = useNavigate();

  return (
    <Card className="border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Calendar className="h-12 w-12 text-primary/60 mb-4" />
        <h3 className="font-semibold text-lg text-foreground">No hay tareas para hoy 🎉</h3>
        <p className="text-muted-foreground mt-1">¡Disfruta tu tiempo libre o planifica con anticipación!</p>
        <Button
          className="mt-4 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md hover:bg-primary/90 hover:text-primary-foreground"
          onClick={() => navigate('/crear')}
        >
          Crear actividad
        </Button>
      </CardContent>
    </Card>
  );
};
