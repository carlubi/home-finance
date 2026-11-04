import { describe, expect, it } from "vitest";
import { dateAfterDays, dueDateForWeek, madridDate, taskDueDateForWeek, taskOccursOnDate, weekdayOf, weekStart } from "./domestic-tasks";
import { reminderId } from "./domestic-task-reminder";

describe("domestic tasks schedule", () => {
  it("uses Monday as the first day and crosses month boundaries", () => {
    expect(weekStart("2026-11-04")).toBe("2026-11-02");
    expect(weekdayOf("2026-11-08")).toBe(6);
    expect(dueDateForWeek("2026-11-30", 6)).toBe("2026-12-06");
    expect(dateAfterDays("2026-11-01", -1)).toBe("2026-10-31");
  });

  it("uses the Madrid date around UTC midnight and daylight savings", () => {
    expect(madridDate(new Date("2026-07-01T22:30:00Z"))).toBe("2026-07-02");
    expect(madridDate(new Date("2026-11-01T22:30:00Z"))).toBe("2026-11-01");
  });

  it("generates separate stable IDs for each occurrence and reminder", () => {
    const due = reminderId("task", "2026-11-04", "due");
    expect(due).toBe(reminderId("task", "2026-11-04", "due"));
    expect(due).not.toBe(reminderId("task", "2026-11-04", "overdue"));
    expect(due).not.toBe(reminderId("task", "2026-11-11", "due"));
  });

  it("shows a dated task only in its scheduled week and keeps weekly tasks recurring", () => {
    const dated = { weekday: null, scheduled_date: "2026-11-05", starts_on: "2026-11-05" };
    const weekly = { weekday: 3, scheduled_date: null, starts_on: "2026-11-05" };
    expect(taskDueDateForWeek(dated, "2026-11-02")).toBe("2026-11-05");
    expect(taskDueDateForWeek(dated, "2026-11-09")).toBeNull();
    expect(taskOccursOnDate(dated, "2026-11-05")).toBe(true);
    expect(taskOccursOnDate(dated, "2026-11-12")).toBe(false);
    expect(taskDueDateForWeek(weekly, "2026-11-02")).toBe("2026-11-05");
    expect(taskDueDateForWeek(weekly, "2026-11-09")).toBe("2026-11-12");
    expect(taskOccursOnDate(weekly, "2026-11-12")).toBe(true);
  });
});
