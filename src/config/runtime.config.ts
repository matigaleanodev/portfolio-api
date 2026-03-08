export function parseCorsOrigins(value: string | undefined): string[] | boolean {
  const normalized = value?.trim();

  if (!normalized) {
    return false;
  }

  if (normalized === '*') {
    return true;
  }

  const origins = normalized
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : false;
}

export function parseTrustProxy(value: string | undefined): boolean | number {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || normalized === 'false' || normalized === '0') {
    return false;
  }

  if (normalized === 'true') {
    return true;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return false;
  }

  return parsed;
}
