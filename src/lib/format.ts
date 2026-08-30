export function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return '৳—';
  return '৳' + n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
