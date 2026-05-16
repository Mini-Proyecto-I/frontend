/** Horas decimales del API o texto legado → número. */
export function parseEstimatedHours(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const s = String(value).trim().toLowerCase().replace(",", ".");

  const hMinMatch = s.match(/^(\d+(?:\.\d+)?)\s*h(?:\s*(\d+)\s*min)?$/);
  if (hMinMatch) {
    const h = parseFloat(hMinMatch[1]) || 0;
    const min = hMinMatch[2] ? parseInt(hMinMatch[2], 10) : 0;
    return h + min / 60;
  }

  const minOnly = s.match(/^(\d+)\s*min$/);
  if (minOnly) {
    return parseInt(minOnly[1], 10) / 60;
  }

  const stripped = s.replace(/\s*h\s*$/i, "").trim();
  const direct = parseFloat(stripped);
  return Number.isFinite(direct) ? direct : 0;
}

export function formatStudyHours(hours: string | number | null | undefined): string {
  const parsed =
    typeof hours === "number" ? hours : parseFloat(String(hours ?? "").replace(",", "."));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "0h";
  }

  const totalMinutes = Math.round(parsed * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (wholeHours <= 0) {
    return `${minutes}min`;
  }
  if (minutes === 0) {
    return `${wholeHours}h`;
  }

  return `${wholeHours}h ${minutes}min`;
}

export function normalizeHalfHourStep(value: number, min = 1, max = 24): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  const clamped = Math.min(max, Math.max(min, value));
  return Math.round(clamped * 2) / 2;
}
