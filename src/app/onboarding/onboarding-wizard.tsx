"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { completeOnboarding, type OnboardingData } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { parseMoneyInput } from "@/lib/format";

const GOALS = [
  ["ahorrar", "Ahorrar más"],
  ["reducir", "Reducir gastos"],
  ["controlar", "Controlar gastos"],
  ["deudas", "Pagar deudas"],
  ["invertir", "Invertir"],
  ["compartidos", "Gestionar gastos compartidos"],
  ["otro", "Otro"],
] as const;

const HABITS = [
  "Restaurantes",
  "Compras online",
  "Supermercado",
  "Transporte",
  "Ocio",
  "Viajes",
  "Suscripciones",
  "Otros",
];

const FIXED_EXPENSES = [
  "Alquiler",
  "Hipoteca",
  "Servicios",
  "Transporte",
  "Seguros",
  "Suscripciones",
  "Otros",
];

const SHARED_TYPES = [
  "Alquiler",
  "Luz",
  "Agua",
  "Internet",
  "Supermercado",
  "Limpieza",
  "Otros",
];

const TOTAL_STEPS = 7;

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function CheckboxGrid({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => (
        <Label
          key={option}
          className="flex cursor-pointer items-center gap-2 rounded-md border p-3 font-normal has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
        >
          <Checkbox
            checked={selected.includes(option)}
            onCheckedChange={() => onToggle(option)}
          />
          {option}
        </Label>
      ))}
    </div>
  );
}

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-3">
      <Button
        type="button"
        variant={value === true ? "default" : "outline"}
        className="flex-1"
        onClick={() => onChange(true)}
      >
        Sí
      </Button>
      <Button
        type="button"
        variant={value === false ? "default" : "outline"}
        className="flex-1"
        onClick={() => onChange(false)}
      >
        No
      </Button>
    </div>
  );
}

export function OnboardingWizard({ userId }: { userId: string }) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  const [goal, setGoal] = useState("");
  const [goalOther, setGoalOther] = useState("");
  const [habits, setHabits] = useState<string[]>([]);
  const [fixedIncomeAmount, setFixedIncomeAmount] = useState("");
  const [fixedExpenseTypes, setFixedExpenseTypes] = useState<string[]>([]);
  const [invests, setInvests] = useState<boolean | null>(null);
  const [investmentName, setInvestmentName] = useState("");
  const [investmentMonthly, setInvestmentMonthly] = useState("");
  const [investmentOneOff, setInvestmentOneOff] = useState("");
  const [investmentCapital, setInvestmentCapital] = useState("");
  const [statementPath, setStatementPath] = useState<string | null>(null);
  const [statementName, setStatementName] = useState<string | null>(null);
  const [sharesExpenses, setSharesExpenses] = useState<boolean | null>(null);
  const [groupName, setGroupName] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [sharedExpenseTypes, setSharedExpenseTypes] = useState<string[]>([]);

  async function uploadStatement(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${userId}/imports/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("documents")
        .upload(path, file);
      if (error) throw error;
      setStatementPath(path);
      setStatementName(file.name);
      toast.success("Extracto subido. Lo procesaremos desde Importar.");
    } catch {
      toast.error("No se pudo subir el archivo.");
    } finally {
      setUploading(false);
    }
  }

  function finish() {
    const data: OnboardingData = {
      goal,
      goalOther,
      habits,
      hasFixedIncome: true,
      fixedIncomeAmount: parseMoneyInput(fixedIncomeAmount),
      fixedExpenseTypes,
      invests,
      investmentName,
      investmentMonthly: investmentMonthly ? Number(investmentMonthly) : null,
      investmentOneOff: investmentOneOff ? Number(investmentOneOff) : null,
      investmentCapital: investmentCapital ? Number(investmentCapital) : null,
      sharesExpenses,
      groupName,
      inviteEmails: inviteEmails.split(/[\n,;]+/),
      sharedExpenseTypes,
      statementPath,
      statementName,
    };
    startTransition(async () => {
      const result = await completeOnboarding(data);
      if (result?.error) toast.error(result.error);
    });
  }

  const steps: {
    title: string;
    description?: string;
    content: React.ReactNode;
    canContinue: boolean;
  }[] = [
    {
      title: "¿Cuál es tu objetivo financiero principal?",
      content: (
        <div className="grid gap-3">
          <RadioGroup value={goal} onValueChange={(v) => setGoal(String(v))}>
            {GOALS.map(([value, label]) => (
              <Label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded-md border p-3 font-normal has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
              >
                <RadioGroupItem value={value} />
                {label}
              </Label>
            ))}
          </RadioGroup>
          {goal === "otro" && (
            <Input
              placeholder="Cuéntanos tu objetivo"
              value={goalOther}
              onChange={(e) => setGoalOther(e.target.value)}
            />
          )}
        </div>
      ),
      canContinue: goal !== "",
    },
    {
      title: "¿Cuáles son tus hábitos de consumo principales?",
      description: "Selecciona todos los que apliquen.",
      content: (
        <CheckboxGrid
          options={HABITS}
          selected={habits}
          onToggle={(v) => setHabits((h) => toggle(h, v))}
        />
      ),
      canContinue: true,
    },
    {
      title: "¿Cuál es tu ingreso mensual (salario)?",
      description:
        "Puedes indicar un salario fijo o un promedio mensual si tus ingresos varían.",
      content: (
        <div className="grid gap-2">
          <Label htmlFor="income-amount">Importe aproximado (€/mes)</Label>
          <Input
            id="income-amount"
            type="text"
            inputMode="decimal"
            value={fixedIncomeAmount}
            onChange={(e) => setFixedIncomeAmount(e.target.value)}
            placeholder="Ej. 1.800,50"
          />
          <p className="text-xs text-muted-foreground">
            Puedes usar decimales con coma o punto. También se aceptan puntos como
            separador de miles, por ejemplo <span className="tabular-nums">1.800,50</span>.
          </p>
        </div>
      ),
      canContinue: (parseMoneyInput(fixedIncomeAmount) ?? 0) > 0,
    },
    {
      title: "¿Tienes gastos fijos mensuales?",
      description: "Selecciona los que tengas.",
      content: (
        <CheckboxGrid
          options={FIXED_EXPENSES}
          selected={fixedExpenseTypes}
          onToggle={(v) => setFixedExpenseTypes((t) => toggle(t, v))}
        />
      ),
      canContinue: true,
    },
    {
      title: "¿Inviertes actualmente?",
      content: (
        <div className="grid gap-4">
          <YesNo value={invests} onChange={setInvests} />
          {invests && (
            <>
              <div className="grid gap-2">
                <Label>¿En qué inviertes?</Label>
                <Input
                  placeholder="Fondos indexados, acciones, cripto…"
                  value={investmentName}
                  onChange={(e) => setInvestmentName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Mensual (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={investmentMonthly}
                    onChange={(e) => setInvestmentMonthly(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Puntual (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={investmentOneOff}
                    onChange={(e) => setInvestmentOneOff(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Capital acumulado aproximado (€)</Label>
                <Input
                  type="number"
                  min="0"
                  value={investmentCapital}
                  onChange={(e) => setInvestmentCapital(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      ),
      canContinue: invests !== null,
    },
    {
      title: "¿Quieres subir un extracto bancario?",
      description:
        "Sube un extracto anual o de los últimos meses (Excel, CSV, PDF o Word) y la IA detectará gastos fijos y patrones automáticamente. Es opcional.",
      content: (
        <div className="grid gap-3">
          <Label
            htmlFor="statement"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-8 text-center"
          >
            {uploading ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <FileUp className="size-6 text-muted-foreground" />
            )}
            <span className="text-sm font-normal text-muted-foreground">
              {statementName ?? "Pulsa para seleccionar un archivo"}
            </span>
          </Label>
          <input
            id="statement"
            type="file"
            className="hidden"
            accept=".csv,.xls,.xlsx,.pdf,.doc,.docx"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadStatement(f);
            }}
          />
        </div>
      ),
      canContinue: !uploading,
    },
    {
      title: "¿Compartes gastos con otras personas?",
      description:
        "Por ejemplo si vives de alquiler con compañeros o compartes gastos del hogar.",
      content: (
        <div className="grid gap-4">
          <YesNo value={sharesExpenses} onChange={setSharesExpenses} />
          {sharesExpenses && (
            <>
              <div className="grid gap-2">
                <Label>Nombre del grupo</Label>
                <Input
                  placeholder="Piso de la calle Mayor"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Invita por email (uno por línea)</Label>
                <Textarea
                  placeholder={"ana@email.com\nluis@email.com"}
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>¿Qué gastos soléis compartir?</Label>
                <CheckboxGrid
                  options={SHARED_TYPES}
                  selected={sharedExpenseTypes}
                  onToggle={(v) => setSharedExpenseTypes((t) => toggle(t, v))}
                />
              </div>
            </>
          )}
        </div>
      ),
      canContinue:
        sharesExpenses !== null && (!sharesExpenses || groupName.trim() !== ""),
    },
  ];

  const current = steps[step];
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <Card className="animate-pop-in">
      <CardHeader>
        <Progress value={((step + 1) / TOTAL_STEPS) * 100} className="mb-4" />
        <CardTitle>{current.title}</CardTitle>
        {current.description && (
          <CardDescription>{current.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="grid gap-6">
        {current.content}
        <div className="flex justify-between">
          <Button
            variant="ghost"
            disabled={step === 0 || pending}
            onClick={() => setStep((s) => s - 1)}
          >
            Atrás
          </Button>
          <Button
            disabled={!current.canContinue || pending}
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          >
            {pending ? "Guardando…" : isLast ? "Terminar" : "Continuar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
