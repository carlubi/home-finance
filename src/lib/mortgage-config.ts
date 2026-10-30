import { parseMoneyInput } from "./format";
import { roundCents, type MortgageTerms } from "./mortgage";

export type MortgageDraft = {
  rateKind: MortgageTerms["rateKind"];
  lender: string;
  firstBorrower: string;
  secondBorrower: string;
  purchasePrice: string;
  principal: string;
  startedOn: string;
  endsOn: string;
  fixedRate: string;
  fixedPayment: string;
  fixedUntil: string;
  variableFrom: string;
  spread: string;
  currentPayment: string;
  lastRecordedOn: string;
  lastRecordedBalance: string;
  paidTotalToDate: string;
  firstSharePercent: string;
};

export const emptyMortgageDraft: MortgageDraft = {
  rateKind: "mixed", lender: "", firstBorrower: "", secondBorrower: "",
  purchasePrice: "", principal: "", startedOn: "", endsOn: "",
  fixedRate: "", fixedPayment: "", fixedUntil: "", variableFrom: "",
  spread: "", currentPayment: "", lastRecordedOn: "",
  lastRecordedBalance: "", paidTotalToDate: "", firstSharePercent: "50",
};

export function draftFromMortgage(mortgage: MortgageTerms): MortgageDraft {
  return {
    rateKind: mortgage.rateKind, lender: mortgage.lender,
    firstBorrower: mortgage.firstBorrower, secondBorrower: mortgage.secondBorrower,
    purchasePrice: String(mortgage.purchasePrice), principal: String(mortgage.principal),
    startedOn: mortgage.startedOn, endsOn: mortgage.endsOn,
    fixedRate: String(mortgage.fixedRate), fixedPayment: String(mortgage.fixedPayment),
    fixedUntil: mortgage.fixedUntil, variableFrom: mortgage.variableFrom,
    spread: String(mortgage.spread), currentPayment: String(mortgage.currentPayment),
    lastRecordedOn: mortgage.lastRecordedOn, lastRecordedBalance: String(mortgage.lastRecordedBalance),
    paidTotalToDate: mortgage.paidTotalToDate === null ? "" : String(mortgage.paidTotalToDate),
    firstSharePercent: String(mortgage.firstSharePercent),
  };
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function rate(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseMortgageDraft(draft: MortgageDraft):
  | { data: Omit<MortgageTerms, "familyUnitId">; error?: never }
  | { data?: never; error: string } {
  if (!["fixed", "mixed", "variable"].includes(draft.rateKind)) return { error: "Selecciona el tipo de interés." };
  const lender = draft.lender.trim();
  const firstBorrower = draft.firstBorrower.trim();
  const secondBorrower = draft.secondBorrower.trim();
  if (!lender || !firstBorrower || lender.length > 100 || firstBorrower.length > 100 || secondBorrower.length > 100) {
    return { error: "Indica la entidad y el nombre del primer titular." };
  }
  const purchasePrice = parseMoneyInput(draft.purchasePrice);
  const principal = parseMoneyInput(draft.principal);
  const currentPayment = parseMoneyInput(draft.currentPayment);
  if (purchasePrice === null || purchasePrice <= 0 || principal === null || principal <= 0 || currentPayment === null || currentPayment <= 0) {
    return { error: "Indica precio, capital concedido y cuota actual mayores que cero." };
  }
  const startedOn = draft.startedOn;
  const endsOn = draft.endsOn;
  if (!validDate(startedOn) || !validDate(endsOn) || endsOn <= startedOn) return { error: "Revisa las fechas de inicio y finalización." };
  const fixedRate = draft.rateKind === "variable" ? 0 : rate(draft.fixedRate);
  const fixedPayment = draft.rateKind === "variable" ? currentPayment : parseMoneyInput(draft.fixedPayment);
  const fixedUntil = draft.rateKind === "variable" ? startedOn : draft.rateKind === "fixed" ? endsOn : draft.fixedUntil;
  const variableFrom = draft.rateKind === "fixed" ? endsOn : draft.rateKind === "variable" ? startedOn : draft.variableFrom;
  const spread = draft.rateKind === "fixed" ? 0 : rate(draft.spread);
  if (fixedRate === null || fixedRate < 0 || fixedRate > 30 || fixedPayment === null || fixedPayment <= 0
    || spread === null || spread < 0 || spread > 30) return { error: "Revisa los tipos de interés, el diferencial y la cuota fija." };
  if (!validDate(fixedUntil) || !validDate(variableFrom)
    || (draft.rateKind === "mixed" && (fixedUntil < startedOn || variableFrom <= fixedUntil || variableFrom > endsOn))) {
    return { error: "Revisa el final del tramo fijo y el inicio del variable." };
  }
  const lastRecordedOn = draft.lastRecordedOn || startedOn;
  const lastRecordedBalance = draft.lastRecordedBalance ? parseMoneyInput(draft.lastRecordedBalance) : principal;
  const paidTotalToDate = draft.paidTotalToDate ? parseMoneyInput(draft.paidTotalToDate) : lastRecordedBalance === principal ? 0 : null;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  if (!validDate(lastRecordedOn) || lastRecordedOn < startedOn || lastRecordedOn > today
    || lastRecordedBalance === null || lastRecordedBalance < 0 || lastRecordedBalance > principal
    || (paidTotalToDate !== null && (paidTotalToDate < 0 || paidTotalToDate < principal - lastRecordedBalance))) {
    return { error: "Revisa el saldo pendiente, la fecha de saldo y el total abonado." };
  }
  const firstSharePercent = secondBorrower ? Number(draft.firstSharePercent) : 100;
  if (!Number.isInteger(firstSharePercent) || firstSharePercent < 0 || firstSharePercent > 100) {
    return { error: "El reparto debe estar entre 0 % y 100 %." };
  }
  return { data: {
    rateKind: draft.rateKind, lender, firstBorrower, secondBorrower,
    firstSharePercent, purchasePrice: roundCents(purchasePrice), principal: roundCents(principal),
    startedOn, endsOn, fixedRate, fixedPayment: roundCents(fixedPayment),
    currentPayment: roundCents(currentPayment), fixedUntil, variableFrom, spread,
    lastRecordedOn, lastRecordedBalance: roundCents(lastRecordedBalance),
    paidTotalToDate: paidTotalToDate === null ? null : roundCents(paidTotalToDate),
  } };
}
