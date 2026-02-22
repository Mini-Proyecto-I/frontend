import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/shared/components/card";
import { Button } from "@/shared/components/button";

export const EmptyState = () => {
  const navigate = useNavigate();

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg">No hay tareas para hoy 🎉</h3>
        <p className="text-muted-foreground mt-1">¡Disfruta tu tiempo libre o planifica con anticipación!</p>
        <Button className="mt-4" onClick={() => navigate('/crear')}>
          Crear actividad
        </Button>
      </CardContent>
    </Card>
  );
};
