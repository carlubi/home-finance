import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/supabase/config";
import { dateAfterDays, madridDate, weekdayOf } from "@/lib/domestic-tasks";
import { reminderId } from "@/lib/domestic-task-reminder";

export const maxDuration = 60;

type Task = { id: string; title: string; family_unit_id: string; assignee_member_id: string; weekday: number; starts_on: string };
type Member = { id: string; user_id: string | null; status: string; role: string };
type ReminderData = { task_id: string; due_date: string; kind: "due" | "overdue"; url: string; email_sent_at?: string; email_provider_id?: string };

async function sendEmail(to: string, subject: string, text: string, id: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) throw new Error("Resend is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": id },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  const result = await response.json() as { id?: string; message?: string };
  if (!response.ok || !result.id) throw new Error(`Resend rejected email (${response.status}): ${result.message ?? "unknown error"}`);
  return result.id;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const admin = createAdminClient();
  const today = madridDate(new Date());
  const userEmails = new Map<string, string | null>();
  const stats = { inAppCreated: 0, emailsSent: 0, emailFailures: 0 };

  for (const kind of ["due", "overdue"] as const) {
    const dueDate = kind === "due" ? today : dateAfterDays(today, -1);
    for (let offset = 0; ; offset += 500) {
      const { data: tasks, error } = await admin.from("domestic_tasks")
        .select("id,title,family_unit_id,assignee_member_id,weekday,starts_on")
        .eq("weekday", weekdayOf(dueDate)).lte("starts_on", dueDate).order("id").range(offset, offset + 499);
      if (error) throw error;
      for (const task of (tasks ?? []) as Task[]) {
        const { data: member, error: memberError } = await admin.from("family_unit_members")
          .select("id,user_id,status,role").eq("id", task.assignee_member_id).eq("unit_id", task.family_unit_id).maybeSingle();
        if (memberError) throw memberError;
        const assignee = member as Member | null;
        if (!assignee?.user_id || assignee.status !== "active") continue;
        if (assignee.role !== "owner") {
          const { data: permission, error: permissionError } = await admin.from("family_section_permissions")
            .select("access").eq("member_id", assignee.id).eq("section", "tasks").maybeSingle();
          if (permissionError) throw permissionError;
          if (permission?.access !== "edit") continue;
        }
        const { data: completion, error: completionError } = await admin.from("domestic_task_completions")
          .select("id").eq("task_id", task.id).eq("due_date", dueDate).maybeSingle();
        if (completionError) throw completionError;
        if (completion) continue;

        const id = reminderId(task.id, dueDate, kind);
        const title = kind === "due" ? `Hoy toca: ${task.title}` : `Pendiente de ayer: ${task.title}`;
        const body = kind === "due" ? "Marca la tarea cuando esté hecha." : "Aún no has marcado esta tarea como hecha.";
        const initialData: ReminderData = { task_id: task.id, due_date: dueDate, kind, url: "/tareas-domesticas" };
        const { error: insertError } = await admin.from("notifications").insert({
          id, user_id: assignee.user_id, type: "domestic_task", title, body, data: initialData,
        });
        if (insertError && insertError.code !== "23505") throw insertError;
        if (!insertError) stats.inAppCreated++;

        const { data: notification, error: notificationError } = await admin.from("notifications")
          .select("title,body,data").eq("id", id).single();
        if (notificationError || !notification) throw notificationError ?? new Error("Reminder was not stored");
        const storedData = notification.data as ReminderData;
        if (storedData.email_sent_at) continue;

        // The task may have been checked while the cron was preparing the email.
        const { data: latestCompletion } = await admin.from("domestic_task_completions")
          .select("id").eq("task_id", task.id).eq("due_date", dueDate).maybeSingle();
        if (latestCompletion) continue;

        if (!userEmails.has(assignee.user_id)) {
          const { data: account, error: accountError } = await admin.auth.admin.getUserById(assignee.user_id);
          if (accountError) throw accountError;
          userEmails.set(assignee.user_id, account.user?.email ?? null);
        }
        const email = userEmails.get(assignee.user_id);
        if (!email) { stats.emailFailures++; continue; }
        try {
          const providerId = await sendEmail(email, `Home Brain: ${title}`,
            `${title}.\n\n${body}\n\nAbre tus tareas: ${getSiteUrl()}/tareas-domesticas`, id);
          const { error: updateError } = await admin.from("notifications")
            .update({ data: { ...storedData, email_sent_at: new Date().toISOString(), email_provider_id: providerId } }).eq("id", id);
          if (updateError) throw updateError;
          stats.emailsSent++;
        } catch (error) {
          stats.emailFailures++;
          console.error("Domestic task email failed", { notificationId: id, error });
        }
      }
      if ((tasks ?? []).length < 500) break;
    }
  }
  return Response.json({ date: today, ...stats }, { status: stats.emailFailures ? 503 : 200 });
}
