// Tipos de dominio (espejo del esquema de Supabase)

export type CategoryKind = "expense" | "income";

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  kind: CategoryKind;
  icon: string | null;
  color: string | null;
}

export interface Expense {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  amount: number;
  occurred_at: string; // fecha real del gasto (YYYY-MM-DD)
  payment_method: string | null;
  notes: string | null;
  attachment_path: string | null;
  tags: string[];
  source: "manual" | "import";
  import_id: string | null;
  created_at: string;
  categories?: Category | null;
}

export interface Income {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  amount: number;
  occurred_at: string;
  is_recurring: boolean;
  notes: string | null;
  source: "manual" | "import";
  import_id: string | null;
  created_at: string;
  categories?: Category | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
  currency: string;
  onboarding_completed: boolean;
}

export interface MonthlySummary {
  user_id: string;
  month: string;
  total_income: number;
  total_expenses: number;
  savings: number;
  savings_pct: number | null;
}

export interface CategoryTotal {
  user_id: string;
  month: string;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  total: number;
  num_expenses?: number;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  monthly_limit: number;
  categories?: Category | null;
}

export interface ImportedFile {
  id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  status: "pending" | "processing" | "ready" | "confirmed" | "error";
  error_message: string | null;
  created_at: string;
}

export interface ExtractedTransaction {
  id: string;
  import_id: string;
  user_id: string;
  kind: CategoryKind;
  name: string;
  suggested_category_id: string | null;
  amount: number;
  occurred_at: string;
  is_recurring: boolean;
  notes: string | null;
  status: "pending" | "confirmed" | "discarded";
}

export interface MonthlyReport {
  id: string;
  user_id: string;
  month: string;
  content_md: string;
  content_json: Record<string, unknown> | null;
  created_at: string;
}

export interface SharedGroup {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string | null;
  email: string;
  display_name: string | null;
  role: "owner" | "member";
  status: "invited" | "active" | "removed";
  joined_at: string | null;
}

export interface SharedExpense {
  id: string;
  group_id: string;
  name: string;
  total_amount: number;
  occurred_at: string;
  paid_by: string;
  category_id: string | null;
  receipt_path: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  categories?: Category | null;
  shared_expense_participants?: SharedExpenseParticipant[];
}

export interface SharedExpenseParticipant {
  id: string;
  shared_expense_id: string;
  member_id: string;
  share_amount: number;
}

export interface DebtSettlement {
  id: string;
  group_id: string;
  from_member: string;
  to_member: string;
  amount: number;
  paid_amount: number;
  month: string;
  status: "pending" | "partial" | "paid";
  paid_at: string | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}
