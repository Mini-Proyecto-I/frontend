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
