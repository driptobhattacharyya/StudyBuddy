/** Minimal variant lookup helper (avoids a class-variance-authority dependency). */
export const cva = (map, key) => map[key] ?? Object.values(map)[0]
