/**
 * Extrae el primer mensaje legible de una respuesta de error típica de Django REST Framework
 * (campos con listas de strings, `detail`, etc.).
 */
export function getApiValidationErrorMessage(
  error: unknown,
  fallback: string
): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== "object" || data === null) {
    return fallback;
  }
  const o = data as Record<string, unknown>;

  const pick = (key: string): string | null => {
    const v = o[key];
    if (v == null) return null;
    if (typeof v === "string" && v.trim()) return v.trim();
    if (Array.isArray(v) && v.length > 0) {
      const first = v[0];
      if (typeof first === "string" && first.trim()) return first.trim();
    }
    return null;
  };

  for (const key of [
    "title",
    "estimated_hours",
    "target_date",
    "status",
    "order",
    "detail",
  ]) {
    const m = pick(key);
    if (m) return m;
  }
  const nf = pick("non_field_errors");
  if (nf) return nf;

  for (const val of Object.values(o)) {
    if (typeof val === "string" && val.trim()) return val.trim();
    if (
      Array.isArray(val) &&
      val.length > 0 &&
      typeof val[0] === "string" &&
      val[0].trim()
    ) {
      return val[0].trim();
    }
  }

  return fallback;
}

/** Mensaje si no hay cuerpo de error parseable (red, timeout, 500 sin detalle, etc.). */
export const SUBTASK_SAVE_GENERIC_FALLBACK =
  "No pudimos guardar los cambios. Comprueba el título, las horas y tu límite diario e inténtalo de nuevo.";
