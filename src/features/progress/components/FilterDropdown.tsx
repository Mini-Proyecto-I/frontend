    import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
    } from "@/shared/components/select";

    import { Course } from "@/features/progress/hooks/useProgressData";

    type Props = {
    courseFilter: string;
    statusFilter: string;
    setCourseFilter: (value: string) => void;
    setStatusFilter: (value: string) => void;
    courses: Course[];
    };

    export default function FilterDropdown({
    courseFilter,
    statusFilter,
    setCourseFilter,
    setStatusFilter,
    courses,
    }: Props) {
    return (
        <div className="flex flex-wrap gap-4">
        
        {/* FILTRO CURSO */}
        <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Curso</label>

            <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="min-w-[200px]">
                <SelectValue placeholder="Todos los cursos" />
            </SelectTrigger>

            <SelectContent>
                <SelectItem value="all">Todos los cursos</SelectItem>

                {courses.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                    {c.name}
                </SelectItem>
                ))}
            </SelectContent>
            </Select>
        </div>

        {/* FILTRO ESTADO */}
        <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Estado</label>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="min-w-[180px]">
                <SelectValue placeholder="Todos" />
            </SelectTrigger>

            <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDING">Pendiente</SelectItem>
                <SelectItem value="DONE">Completado</SelectItem>
                <SelectItem value="POSTPONED">Pospuesto</SelectItem>
                <SelectItem value="WAITING">Esperando</SelectItem>
            </SelectContent>
            </Select>
        </div>

        </div>
    );
    }