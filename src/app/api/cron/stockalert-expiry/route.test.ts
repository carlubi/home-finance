import { afterEach, describe, expect, it, vi } from "vitest";
import { dateAfterDays, madridDate } from "@/lib/stockalert-reminders";

const state = vi.hoisted(() => ({ admin: null as unknown }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/supabase/config", () => ({ getSiteUrl: () => "https://home.example" }));

import { GET } from "./route";

afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  vi.unstubAllGlobals();
});

describe("StockAlert daily reminders", () => {
  it("requires the cron secret", async () => {
    process.env.CRON_SECRET = "test-secret";
    const response = await GET(new Request("https://home.example/api/cron/stockalert-expiry"));
    expect(response.status).toBe(401);
  });

  it("sends each milestone only once to the product owner", async () => {
    process.env.CRON_SECRET = "test-secret";
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_EMAIL = "Home Brain <avisos@example.com>";
    const today = madridDate(new Date());
    const products = [
      { id: "product-10", owner_id: "carla", name: "Mermelada", status: "active", expiration_date: dateAfterDays(today, 10) },
      { id: "product-3", owner_id: "carla", name: "Leche", status: "active", expiration_date: dateAfterDays(today, 3) },
      { id: "product-0", owner_id: "other", name: "Pan", status: "active", expiration_date: today },
      { id: "archived", owner_id: "other", name: "Archivado", status: "archived", expiration_date: today },
    ];
    const notifications = new Map<string, { id: string; user_id: string; title: string; body: string; data: Record<string, unknown> }>();
    const emails: { to: string[]; subject: string }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
      const payload = JSON.parse(String(options.body));
      emails.push({ to: payload.to, subject: payload.subject });
      return Response.json({ id: `email-${emails.length}` });
    }));
    state.admin = {
      from(table: string) {
        if (table === "stockalert_products") {
          const filters: Record<string, string> = {};
          const builder = {
            select: () => builder,
            eq(key: string, value: string) { filters[key] = value; return builder; },
            order: () => builder,
            async range(from: number, to: number) {
              return { data: products.filter((product) => product.status === filters.status && product.expiration_date === filters.expiration_date).slice(from, to + 1), error: null };
            },
          };
          return builder;
        }
        if (table === "notifications") {
          return {
            async insert(value: { id: string; user_id: string; title: string; body: string; data: Record<string, unknown> }) {
              if (notifications.has(value.id)) return { error: { code: "23505" } };
              notifications.set(value.id, value);
              return { error: null };
            },
            select() {
              return { eq(_key: string, id: string) { return { async single() {
                const value = notifications.get(id);
                return { data: value ? { title: value.title, body: value.body, data: value.data } : null, error: null };
              } }; } };
            },
            update(value: { data: Record<string, unknown> }) {
              return { async eq(_key: string, id: string) {
                const current = notifications.get(id)!;
                notifications.set(id, { ...current, data: value.data });
                return { error: null };
              } };
            },
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
      auth: { admin: { async getUserById(id: string) {
        return { data: { user: { email: id === "carla" ? "carla@example.com" : "other@example.com" } }, error: null };
      } } },
    };

    const request = new Request("https://home.example/api/cron/stockalert-expiry", { headers: { authorization: "Bearer test-secret" } });
    const first = await GET(request);
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ inAppCreated: 3, emailsSent: 3, emailFailures: 0 });
    expect(emails.map((email) => email.to[0])).toEqual(["carla@example.com", "carla@example.com", "other@example.com"]);
    expect(notifications.size).toBe(3);
    expect([...notifications.values()].map((notification) => notification.user_id)).toEqual(["carla", "carla", "other"]);

    const second = await GET(request);
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ inAppCreated: 0, emailsSent: 0, emailFailures: 0 });
    expect(emails).toHaveLength(3);
  });
});
