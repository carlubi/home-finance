export type FamilyChoice = { id: string; owner_id: string; name: string };

/** The previous app chose the most recently joined active family. */
export function pickFamilyUnit<T extends FamilyChoice>(units: T[], selectedId?: string | null): T | null {
  return units.find((unit) => unit.id === selectedId) ?? units[0] ?? null;
}
