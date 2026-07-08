// Lógica de cálculo financiero pura (testeable sin Supabase)

export interface MemberBalance {
  memberId: string;
  paid: number; // total pagado por el miembro
  owes: number; // total que le corresponde asumir
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

/** Redondeo a céntimos evitando errores de coma flotante */
export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Reparte un importe entre n participantes en partes que suman exacto
 * (los céntimos sobrantes se asignan a los primeros).
 */
export function splitAmount(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / parts);
  const remainder = cents - base * parts;
  return Array.from({ length: parts }, (_, i) =>
    (base + (i < remainder ? 1 : 0)) / 100
  );
}

/**
 * Simplificación de deudas: dado el balance neto de cada miembro
 * (pagado - le corresponde), devuelve el mínimo razonable de
 * transferencias (greedy: mayores deudores pagan a mayores acreedores).
 */
export function simplifyDebts(balances: MemberBalance[]): Transfer[] {
  const debtors = balances
    .map((b) => ({ id: b.memberId, net: roundCents(b.paid - b.owes) }))
    .filter((b) => b.net < -0.004)
    .sort((a, b) => a.net - b.net); // más deudor primero
  const creditors = balances
    .map((b) => ({ id: b.memberId, net: roundCents(b.paid - b.owes) }))
    .filter((b) => b.net > 0.004)
    .sort((a, b) => b.net - a.net); // más acreedor primero

  const transfers: Transfer[] = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const debt = -debtors[d].net;
    const credit = creditors[c].net;
    const amount = roundCents(Math.min(debt, credit));
    if (amount > 0) {
      transfers.push({ from: debtors[d].id, to: creditors[c].id, amount });
    }
    debtors[d].net = roundCents(debtors[d].net + amount);
    creditors[c].net = roundCents(creditors[c].net - amount);
    if (debtors[d].net >= -0.004) d++;
    if (creditors[c].net <= 0.004) c++;
  }
  return transfers;
}

export interface GroupExpenseLike {
  paid_by: string;
  total_amount: number;
  participants: { member_id: string; share_amount: number }[];
}

export interface PaymentLike {
  from_member: string;
  to_member: string;
  amount: number;
}

export interface MemberPosition {
  memberId: string;
  paid: number; // pagado en gastos del grupo
  owes: number; // parte que le corresponde asumir
  net: number; // posición neta incluyendo pagos de deudas
}

/**
 * Posición de cada miembro en un conjunto de gastos compartidos:
 * net = pagado - le corresponde + deudas pagadas - deudas cobradas.
 * net > 0 → le deben; net < 0 → debe.
 */
export function computePositions(
  memberIds: string[],
  expenses: GroupExpenseLike[],
  payments: PaymentLike[]
): MemberPosition[] {
  const positions = new Map<string, MemberPosition>(
    memberIds.map((id) => [id, { memberId: id, paid: 0, owes: 0, net: 0 }])
  );
  const get = (id: string) => {
    if (!positions.has(id)) {
      positions.set(id, { memberId: id, paid: 0, owes: 0, net: 0 });
    }
    return positions.get(id)!;
  };

  for (const expense of expenses) {
    get(expense.paid_by).paid = roundCents(
      get(expense.paid_by).paid + Number(expense.total_amount)
    );
    for (const p of expense.participants) {
      get(p.member_id).owes = roundCents(
        get(p.member_id).owes + Number(p.share_amount)
      );
    }
  }

  for (const pos of positions.values()) {
    pos.net = roundCents(pos.paid - pos.owes);
  }
  for (const payment of payments) {
    get(payment.from_member).net = roundCents(
      get(payment.from_member).net + Number(payment.amount)
    );
    get(payment.to_member).net = roundCents(
      get(payment.to_member).net - Number(payment.amount)
    );
  }

  return [...positions.values()];
}

/** Transferencias pendientes a partir de posiciones netas */
export function pendingTransfers(positions: MemberPosition[]): Transfer[] {
  return simplifyDebts(
    positions.map((p) => ({ memberId: p.memberId, paid: p.net, owes: 0 }))
  );
}

/** Variación porcentual respecto a un valor anterior (null si no hay base) */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return roundCents(((current - previous) / Math.abs(previous)) * 100);
}
