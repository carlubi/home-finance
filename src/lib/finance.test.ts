import { describe, expect, it } from "vitest";
import {
  computePositions,
  investmentActualValueAtMonth,
  investmentMonthlyContribution,
  investmentMonthlyOutflow,
  investmentProjectedValueAtMonth,
  pctChange,
  pendingTransfers,
  roundCents,
  simplifyDebts,
  splitAmount,
} from "./finance";

describe("splitAmount", () => {
  it("reparte en partes iguales exactas", () => {
    expect(splitAmount(90, 3)).toEqual([30, 30, 30]);
  });

  it("asigna los céntimos sobrantes a los primeros", () => {
    const parts = splitAmount(100, 3);
    expect(parts).toEqual([33.34, 33.33, 33.33]);
    expect(roundCents(parts.reduce((a, b) => a + b, 0))).toBe(100);
  });

  it("devuelve vacío con 0 participantes", () => {
    expect(splitAmount(50, 0)).toEqual([]);
  });
});

describe("simplifyDebts — ejemplo del documento", () => {
  it("Ana paga 90 € entre Ana, Luis y Marta → cada uno le debe 30 €", () => {
    // Ana pagó 90, le corresponden 30 → net +60. Luis y Marta deben 30.
    const transfers = simplifyDebts([
      { memberId: "ana", paid: 90, owes: 30 },
      { memberId: "luis", paid: 0, owes: 30 },
      { memberId: "marta", paid: 0, owes: 30 },
    ]);
    expect(transfers).toHaveLength(2);
    expect(transfers).toEqual(
      expect.arrayContaining([
        { from: "luis", to: "ana", amount: 30 },
        { from: "marta", to: "ana", amount: 30 },
      ])
    );
  });

  it("minimiza transferencias con deudas cruzadas", () => {
    // A +50, B -20, C -30 → B→A 20, C→A 30 (2 transferencias, no 3)
    const transfers = simplifyDebts([
      { memberId: "a", paid: 60, owes: 10 },
      { memberId: "b", paid: 0, owes: 20 },
      { memberId: "c", paid: 0, owes: 30 },
    ]);
    expect(transfers).toHaveLength(2);
    const total = transfers.reduce((s, t) => s + t.amount, 0);
    expect(total).toBe(50);
  });

  it("sin deudas no hay transferencias", () => {
    expect(
      simplifyDebts([
        { memberId: "a", paid: 25, owes: 25 },
        { memberId: "b", paid: 25, owes: 25 },
      ])
    ).toEqual([]);
  });
});

describe("computePositions + pendingTransfers", () => {
  const members = ["ana", "luis", "marta"];
  const expense = {
    paid_by: "ana",
    total_amount: 90,
    participants: [
      { member_id: "ana", share_amount: 30 },
      { member_id: "luis", share_amount: 30 },
      { member_id: "marta", share_amount: 30 },
    ],
  };

  it("calcula pagado, corresponde y neto", () => {
    const positions = computePositions(members, [expense], []);
    const ana = positions.find((p) => p.memberId === "ana")!;
    expect(ana.paid).toBe(90);
    expect(ana.owes).toBe(30);
    expect(ana.net).toBe(60);
  });

  it("un pago parcial reduce la deuda pendiente", () => {
    const positions = computePositions(
      members,
      [expense],
      [{ from_member: "luis", to_member: "ana", amount: 10 }]
    );
    const transfers = pendingTransfers(positions);
    const luis = transfers.find((t) => t.from === "luis");
    expect(luis).toEqual({ from: "luis", to: "ana", amount: 20 });
  });

  it("pagos completos saldan el grupo", () => {
    const positions = computePositions(
      members,
      [expense],
      [
        { from_member: "luis", to_member: "ana", amount: 30 },
        { from_member: "marta", to_member: "ana", amount: 30 },
      ]
    );
    expect(pendingTransfers(positions)).toEqual([]);
  });

  it("el pagador puede no participar en el gasto", () => {
    const positions = computePositions(["ana", "luis"], [
      {
        paid_by: "ana",
        total_amount: 40,
        participants: [{ member_id: "luis", share_amount: 40 }],
      },
    ], []);
    expect(pendingTransfers(positions)).toEqual([
      { from: "luis", to: "ana", amount: 40 },
    ]);
  });
});

describe("pctChange", () => {
  it("calcula la variación porcentual", () => {
    expect(pctChange(120, 100)).toBe(20);
    expect(pctChange(80, 100)).toBe(-20);
  });

  it("devuelve null sin base de comparación", () => {
    expect(pctChange(50, 0)).toBeNull();
  });
});

describe("investment calculations", () => {
  const investments = [
    {
      monthly_amount: 100,
      one_off_amount: 250,
      accumulated_capital: 1000,
      expected_annual_return_pct: 12,
      created_at: "2026-01-15T10:00:00.000Z",
    },
    {
      monthly_amount: 50,
      one_off_amount: null,
      accumulated_capital: null,
      expected_annual_return_pct: null,
      created_at: "2026-03-01T10:00:00.000Z",
    },
  ];

  it("calcula la aportación mensual recurrente", () => {
    expect(investmentMonthlyContribution(investments)).toBe(150);
  });

  it("incluye aportaciones puntuales solo en el mes de inicio", () => {
    expect(investmentMonthlyOutflow(investments, "2026-01-01")).toBe(350);
    expect(investmentMonthlyOutflow(investments, "2026-03-01")).toBe(150);
  });

  it("calcula el valor acumulado sin rentabilidad por mes", () => {
    expect(investmentActualValueAtMonth(investments, "2026-03-01")).toBe(1600);
  });

  it("proyecta por encima del acumulado cuando hay rentabilidad esperada", () => {
    expect(investmentProjectedValueAtMonth(investments, "2026-03-01")).toBeGreaterThan(
      investmentActualValueAtMonth(investments, "2026-03-01")
    );
  });

  it("respeta la vigencia de una inversión versionada", () => {
    const versioned = [
      {
        monthly_amount: 100,
        one_off_amount: null,
        accumulated_capital: null,
        expected_annual_return_pct: null,
        starts_on: "2026-01-01",
        ends_on: "2026-02-01",
        created_at: "2026-01-01T10:00:00.000Z",
      },
      {
        monthly_amount: 150,
        one_off_amount: null,
        accumulated_capital: 200,
        expected_annual_return_pct: null,
        starts_on: "2026-03-01",
        ends_on: null,
        created_at: "2026-03-01T10:00:00.000Z",
      },
    ];

    expect(investmentMonthlyContribution(versioned, "2026-02-01")).toBe(100);
    expect(investmentMonthlyContribution(versioned, "2026-03-01")).toBe(150);
    expect(investmentActualValueAtMonth(versioned, "2026-03-01")).toBe(350);
  });
});
