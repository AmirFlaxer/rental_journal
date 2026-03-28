/** Convert camelCase object keys → snake_case (for DB inserts/updates) */
export function snakeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(snakeKeys);
  if (obj && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`),
        snakeKeys(v),
      ])
    );
  }
  return obj;
}

/** Convert snake_case object keys → camelCase (for API responses) */
export function camelKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(camelKeys);
  if (obj && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase()),
        camelKeys(v),
      ])
    );
  }
  return obj;
}
