import { createHash } from "node:crypto";

export function reminderId(taskId: string, dueDate: string, kind: "due" | "overdue") {
  const hex = createHash("sha256").update(`domestic-task/${taskId}/${dueDate}/${kind}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
