import { describe, expect, it } from "vitest";
import { dateAfterDays, madridDate, reminderId } from "./stockalert-reminders";

describe("StockAlert reminder schedule", () => {
  it("uses the Madrid calendar day across the daylight-saving change", () => {
    expect(madridDate(new Date("2026-03-29T21:30:00Z"))).toBe("2026-03-29");
    expect(madridDate(new Date("2026-03-29T22:30:00Z"))).toBe("2026-03-30");
    expect(dateAfterDays("2026-03-29", 3)).toBe("2026-04-01");
  });

  it("gives each product, expiry date and milestone a stable distinct ID", () => {
    const id = reminderId("a", "2026-11-14", 10);
    expect(reminderId("a", "2026-11-14", 10)).toBe(id);
    expect(reminderId("a", "2026-11-14", 3)).not.toBe(id);
    expect(reminderId("a", "2026-11-15", 10)).not.toBe(id);
    expect(reminderId("b", "2026-11-14", 10)).not.toBe(id);
  });
});
