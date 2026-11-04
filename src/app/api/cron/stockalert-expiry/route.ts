import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/supabase/config";
import { dateAfterDays, EXPIRY_MILESTONES, madridDate, reminderCopy, reminderId } from "@/lib/stockalert-reminders";

export const maxDuration = 60;

type Product = { id: string; owner_id: string; family_unit_id?: string | null; name: string; expiration_date: string };
type ReminderData = { product_id: string; expiration_date: string; milestone_days: number; url: string; email_sent_at?: string; email_provider_id?: string };

async function sendEmail(to: string, subject: string, body: string, idempotencyKey: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) throw new Error("Resend is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
  });
  const result = await response.json() as { id?: string; message?: string };
  if (!response.ok || !result.id) throw new Error(`Resend rejected email (${response.status}): ${result.message ?? "unknown error"}`);
  return result.id;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const today = madridDate(new Date());
  const userEmails = new Map<string, string | null>();
  const stats = { inAppCreated: 0, emailsSent: 0, emailFailures: 0 };

  for (const days of EXPIRY_MILESTONES) {
    const expirationDate = dateAfterDays(today, days);
    for (let offset = 0; ; offset += 500) {
      const { data: products, error } = await admin.from("stockalert_products")
        .select("id,owner_id,family_unit_id,name,expiration_date")
        .eq("status", "active")
        .eq("expiration_date", expirationDate)
        .order("id")
        .range(offset, offset + 499);
      if (error) throw error;
      for (const product of (products ?? []) as Product[]) {
        if (product.family_unit_id) {
          const { data: membership, error: membershipError } = await admin.from("family_unit_members")
            .select("id,role").eq("unit_id", product.family_unit_id).eq("user_id", product.owner_id).eq("status", "active").maybeSingle();
          if (membershipError) throw membershipError;
          if (!membership) continue;
          if (membership.role !== "owner") {
            const { data: permission, error: permissionError } = await admin.from("family_section_permissions")
              .select("access").eq("member_id", membership.id).eq("section", "pantry").maybeSingle();
            if (permissionError) throw permissionError;
            if (permission?.access === "none" || !permission) continue;
          }
        }
        const id = reminderId(product.id, product.expiration_date, days);
        const copy = reminderCopy(product.name, product.expiration_date, days);
        const initialData: ReminderData = {
          product_id: product.id, expiration_date: product.expiration_date,
          milestone_days: days, url: "/stockalert",
        };
        const { error: insertError } = await admin.from("notifications").insert({
          id, user_id: product.owner_id, type: "stockalert_expiry",
          title: copy.title, body: copy.body, data: initialData,
        });
        if (insertError && insertError.code !== "23505") throw insertError;
        if (!insertError) stats.inAppCreated++;

        const { data: notification, error: notificationError } = await admin.from("notifications")
          .select("title,body,data").eq("id", id).single();
        if (notificationError || !notification) throw notificationError ?? new Error("Reminder was not stored");
        const storedData = notification.data as ReminderData;
        if (storedData.email_sent_at) continue;

        if (!userEmails.has(product.owner_id)) {
          const { data: owner, error: ownerError } = await admin.auth.admin.getUserById(product.owner_id);
          if (ownerError) throw ownerError;
          userEmails.set(product.owner_id, owner.user?.email ?? null);
        }
        const email = userEmails.get(product.owner_id);
        if (!email) { stats.emailFailures++; continue; }
        try {
          const providerId = await sendEmail(
            email, `Home Brain: ${notification.title}`,
            `${notification.title}.\n\n${notification.body ?? ""}\n\nAbre tu despensa: ${getSiteUrl()}/stockalert`,
            id,
          );
          const { error: updateError } = await admin.from("notifications")
            .update({ data: { ...storedData, email_sent_at: new Date().toISOString(), email_provider_id: providerId } })
            .eq("id", id);
          if (updateError) throw updateError;
          stats.emailsSent++;
        } catch (error) {
          stats.emailFailures++;
          console.error("StockAlert reminder email failed", { notificationId: id, error });
        }
      }
      if ((products ?? []).length < 500) break;
    }
  }

  return Response.json({ date: today, ...stats }, { status: stats.emailFailures ? 503 : 200 });
}
