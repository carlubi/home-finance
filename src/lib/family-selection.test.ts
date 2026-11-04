import { describe, expect, it } from "vitest";
import { pickFamilyUnit } from "./family-selection";

const current = { id: "carla-and-munyoz", owner_id: "carla", name: "Casa" };
const older = { id: "older-private", owner_id: "munyoz", name: "Mi unidad familiar" };

describe("family selection", () => {
  it("keeps the currently chosen family when no preference exists", () => {
    expect(pickFamilyUnit([current, older])).toBe(current);
    expect(pickFamilyUnit([current, older], "invalid")).toBe(current);
  });

  it("lets a member switch without moving or deleting the existing family", () => {
    expect(pickFamilyUnit([current, older], older.id)).toBe(older);
    expect(pickFamilyUnit([], older.id)).toBeNull();
  });
});
