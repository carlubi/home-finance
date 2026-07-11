import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addMonths, monthStart } from "@/lib/format";
import { computePositions, pendingTransfers } from "@/lib/finance";
import type {
  Category,
  CategoryTotal,
  DebtSettlement,
  GroupMember,
  SharedExpense,
} from "@/lib/types";
import { MonthSwitcher } from "@/components/dashboard/month-switcher";
import { GroupView } from "./group-view";

export const metadata = { title: "Gastos compartidos" };

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const { groupId } = await params;
  const { mes } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(mes ?? "") ? `${mes}-01` : monthStart(new Date());
  const nextMonth = addMonths(month, 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [groupRes, membersRes, expensesRes, paymentsRes, categoriesRes, allExpensesRes] =
    await Promise.all([
      supabase.from("shared_groups").select("*").eq("id", groupId).single(),
      supabase
        .from("shared_group_members")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at"),
      supabase
        .from("shared_expenses")
        .select("*, categories(*), shared_expense_participants(*)")
        .eq("group_id", groupId)
        .gte("occurred_at", month)
        .lt("occurred_at", nextMonth)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("debt_settlements")
        .select("*")
        .eq("group_id", groupId)
        .eq("month", month)
        .order("paid_at", { ascending: false }),
      supabase.from("categories").select("*").eq("kind", "expense").order("name"),
      // Histórico completo del grupo para la visión global por categoría
      supabase
        .from("shared_expenses")
        .select("total_amount, category_id, categories(name, color)")
        .eq("group_id", groupId),
    ]);

  if (!groupRes.data) notFound();

  // Agregado histórico de gastos del grupo por categoría
  const totalsByCategory = new Map<string, CategoryTotal>();
  for (const row of (allExpensesRes.data ?? []) as unknown as {
    total_amount: number;
    category_id: string | null;
    categories: { name: string; color: string | null } | null;
  }[]) {
    const key = row.category_id ?? "none";
    const existing = totalsByCategory.get(key);
    if (existing) {
      existing.total = Number(existing.total) + Number(row.total_amount);
      existing.num_expenses = (existing.num_expenses ?? 0) + 1;
    } else {
      totalsByCategory.set(key, {
        user_id: groupId,
        month: "",
        category_id: row.category_id,
        category_name: row.categories?.name ?? "Sin categoría",
        category_color: row.categories?.color ?? null,
        total: Number(row.total_amount),
        num_expenses: 1,
      });
    }
  }
  const allCategoryTotals = [...totalsByCategory.values()];

  const members = (membersRes.data ?? []) as GroupMember[];
  const expensesWithSignedUrls = await Promise.all(
    ((expensesRes.data ?? []) as SharedExpense[]).map(async (expense) => {
      if (!expense.receipt_path) return expense;
      const { data } = await supabase.storage
        .from("receipts")
        .createSignedUrl(expense.receipt_path, 60 * 60);
      return {
        ...expense,
        receipt_download_url: data?.signedUrl ?? null,
      };
    })
  );
  const expenses = expensesWithSignedUrls;
  const payments = (paymentsRes.data ?? []) as DebtSettlement[];
  const activeMembers = members.filter((m) => m.status === "active");

  const positions = computePositions(
    activeMembers.map((m) => m.id),
    expenses.map((e) => ({
      paid_by: e.paid_by,
      total_amount: Number(e.total_amount),
      participants: (e.shared_expense_participants ?? []).map((p) => ({
        member_id: p.member_id,
        share_amount: Number(p.share_amount),
      })),
    })),
    payments.map((p) => ({
      from_member: p.from_member,
      to_member: p.to_member,
      amount: Number(p.paid_amount),
    }))
  );
  const transfers = pendingTransfers(positions);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{groupRes.data.name}</h1>
        <Suspense>
          <MonthSwitcher month={month} />
        </Suspense>
      </div>
      <GroupView
        group={groupRes.data}
        members={members}
        expenses={expenses}
        payments={payments}
        positions={positions}
        transfers={transfers}
        categories={(categoriesRes.data ?? []) as Category[]}
        allCategoryTotals={allCategoryTotals}
        month={month}
        currentUserId={user.id}
      />
    </div>
  );
}
