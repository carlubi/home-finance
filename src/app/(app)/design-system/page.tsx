import { AlertCircle, ArrowUpRight, Inbox, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { typeScale } from "@/lib/design-system/tokens";
import { ChartCard } from "@/components/charts/chart-card";
import { IncomeExpenseBars } from "@/components/charts/income-expense-bars";
import { SavingsTrend } from "@/components/charts/savings-trend";
import { CategoryDonut } from "@/components/charts/category-donut";

const demoMonths = ["jun", "jul", "ago", "sep", "oct", "nov"];
const demoBars = demoMonths.map((label, i) => ({ label, Ingresos: 2600 + i * 40, Gastos: 1700 + ((i * 370) % 600) }));
const demoSavings = demoMonths.map((label, i) => ({
  label,
  Ahorro: 4200 + i * 520,
  "Ahorro + cuenta remunerada": 4260 + i * 560,
  "Ahorro + inversión": 6100 + i * 760,
}));
const demoCategories = [
  { category_name: "Vivienda", category_color: "#2a78d6", total: 820 },
  { category_name: "Comida", category_color: "#1baf7a", total: 410 },
  { category_name: "Transporte", category_color: "#eb6834", total: 160 },
  { category_name: "Ocio", category_color: "#e87ba4", total: 120 },
  { category_name: "Suministros", category_color: "#eda100", total: 95 },
  { category_name: "Otros gastos", category_color: "#898781", total: 60 },
] as never[];

export const metadata = { title: "Design system" };

const layers = [
  { token: "bg-bg-primary", label: "Página" },
  { token: "bg-bg-secondary", label: "Card / panel" },
  { token: "bg-bg-tertiary", label: "Anidado / hover" },
  { token: "bg-bg-quaternary", label: "Muy anidado" },
];

const status = [
  { token: "bg-green", label: "green · ingreso, éxito" },
  { token: "bg-red", label: "red · gasto, error" },
  { token: "bg-orange", label: "orange · aviso" },
  { token: "bg-yellow", label: "yellow · precaución" },
  { token: "bg-blue", label: "blue · información" },
  { token: "bg-accent", label: "accent · acción, foco" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border-primary bg-bg-secondary p-4 ${className ?? ""}`}>{children}</div>;
}

export default function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <PageHeader
        eyebrow="Referencia interna"
        title="Design system"
        description="Tokens y componentes base de la app, según el sistema de Linear. Cambia el tema desde el menú de usuario para revisar ambos modos."
      />

      <Section title="Capas de fondo">
        <div className="grid gap-2 sm:grid-cols-4">
          {layers.map((layer) => (
            <div key={layer.token} className={`${layer.token} rounded-lg border border-border-secondary p-4`}>
              <p className="text-[13px] font-medium">{layer.label}</p>
              <code className="text-xs text-text-tertiary">{layer.token}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Texto y estados">
        <Panel className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-text-primary">text-text-primary · contenido</p>
            <p className="text-text-secondary">text-text-secondary · apoyo</p>
            <p className="text-text-tertiary">text-text-tertiary · metadatos</p>
          </div>
          <div className="grid gap-1.5">
            {status.map((item) => (
              <p key={item.token} className="flex items-center gap-2 text-[13px] text-text-secondary">
                <span className={`${item.token} size-2.5 rounded-full`} />{item.label}
              </p>
            ))}
          </div>
        </Panel>
      </Section>

      <Section title="Tipografía">
        <Panel className="divide-y divide-border-primary p-0">
          {Object.entries(typeScale).map(([name, style]) => (
            <div key={name} className="flex items-baseline justify-between gap-4 px-4 py-3">
              <span className={style.className}>{name}</span>
              <code className="shrink-0 text-xs text-text-tertiary tabular-nums">
                {style.fontSize} / {style.lineHeight} · {style.fontWeight}
              </code>
            </div>
          ))}
        </Panel>
      </Section>

      <Section title="Botones">
        <Panel className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primario</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive"><Trash2 /> Eliminar</Button>
            <Button variant="link">Enlace</Button>
            <Button disabled>Deshabilitado</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs">xs</Button>
            <Button size="sm">sm</Button>
            <Button>default</Button>
            <Button size="lg">lg</Button>
            <Button size="icon" variant="outline" aria-label="Añadir"><Plus /></Button>
            <Button size="icon-sm" variant="ghost" aria-label="Buscar"><Search /></Button>
          </div>
        </Panel>
      </Section>

      <Section title="Badges">
        <Panel className="flex flex-wrap gap-2">
          <Badge>Acento</Badge>
          <Badge variant="secondary">Secundario</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Pagado</Badge>
          <Badge variant="info">Programado</Badge>
          <Badge variant="warning">Cerca del límite</Badge>
          <Badge variant="destructive">Excedido</Badge>
        </Panel>
      </Section>

      <Section title="Formularios">
        <Panel className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ds-amount">Importe</Label>
            <Input id="ds-amount" inputMode="decimal" placeholder="0,00 €" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ds-invalid">Con error</Label>
            <Input id="ds-invalid" aria-invalid defaultValue="abc" />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="ds-notes">Notas</Label>
            <Textarea id="ds-notes" placeholder="Escribe una nota…" />
          </div>
          <div className="flex items-center gap-2"><Checkbox id="ds-check" defaultChecked /><Label htmlFor="ds-check">Gasto recurrente</Label></div>
          <div className="flex items-center gap-2"><Switch id="ds-switch" defaultChecked /><Label htmlFor="ds-switch">Compartir con la unidad</Label></div>
          <RadioGroup defaultValue="month" className="flex gap-4">
            <div className="flex items-center gap-2"><RadioGroupItem value="month" id="ds-month" /><Label htmlFor="ds-month">Mensual</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="year" id="ds-year" /><Label htmlFor="ds-year">Anual</Label></div>
          </RadioGroup>
          <Progress value={64} aria-label="Presupuesto consumido" />
        </Panel>
      </Section>

      <Section title="Pestañas">
        <Panel className="grid gap-6 sm:grid-cols-2">
          <Tabs defaultValue="month">
            <TabsList>
              <TabsTrigger value="month">Mes</TabsTrigger>
              <TabsTrigger value="year">Año</TabsTrigger>
              <TabsTrigger value="all">Todo</TabsTrigger>
            </TabsList>
            <TabsContent value="month" className="text-text-secondary">Control segmentado.</TabsContent>
          </Tabs>
          <Tabs defaultValue="expenses">
            <TabsList variant="line">
              <TabsTrigger value="expenses">Gastos</TabsTrigger>
              <TabsTrigger value="income">Ingresos</TabsTrigger>
            </TabsList>
            <TabsContent value="expenses" className="text-text-secondary">Pestañas de sección.</TabsContent>
          </Tabs>
        </Panel>
      </Section>

      <Section title="Card y lista">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Gastos del mes</CardTitle>
              <CardDescription>Comparado con el mes anterior</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">1.284,50 €</p>
              <p className="mt-1 flex items-center gap-0.5 text-xs text-red tabular-nums"><ArrowUpRight className="size-3" />+4,2 % vs mes anterior</p>
            </CardContent>
            <CardFooter className="justify-end"><Button variant="outline" size="sm">Ver detalle</Button></CardFooter>
          </Card>
          <div className="divide-y divide-border-primary overflow-hidden rounded-lg border border-border-primary bg-bg-secondary">
            {[["Supermercado", "Comida", "-86,20 €"], ["Nómina", "Ingreso", "+2.150,00 €"], ["Luz", "Hogar", "-54,10 €"]].map(([name, cat, amount]) => (
              <div key={name} className="flex items-center gap-3 px-4 py-2.5 transition-fast hover:bg-bg-tertiary/60">
                <span className="size-2 rounded-full bg-text-tertiary" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{name}</span>
                <Badge variant="outline">{cat}</Badge>
                <span className={`text-[13px] tabular-nums ${amount.startsWith("+") ? "text-green" : "text-text-primary"}`}>{amount}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Gráficos">
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Ingresos y gastos" description="Últimos 6 meses" fileName="demo-barras"><IncomeExpenseBars data={demoBars} /></ChartCard>
          <ChartCard title="Evolución del ahorro" description="Acumulado" fileName="demo-ahorro"><SavingsTrend data={demoSavings} /></ChartCard>
          <ChartCard title="Gastos por categoría" description="Noviembre" fileName="demo-categorias"><CategoryDonut data={demoCategories} /></ChartCard>
        </div>
      </Section>

      <Section title="Estados">
        <div className="grid gap-4 md:grid-cols-3">
          <Panel className="flex flex-col items-center py-8 text-center">
            <span className="mb-3 grid size-9 place-items-center rounded-full border border-border-primary bg-bg-tertiary text-text-tertiary"><Inbox className="size-4" /></span>
            <p className="text-sm font-medium">Sin movimientos</p>
            <p className="mt-1 text-[13px] text-text-secondary">Añade el primero para empezar.</p>
            <Button size="sm" className="mt-4"><Plus /> Añadir</Button>
          </Panel>
          <div className="rounded-lg border border-red/20 bg-red/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red" />
              <div>
                <p className="text-sm font-medium text-red">No se pudo guardar</p>
                <p className="mt-0.5 text-[13px] text-text-secondary">Revisa la conexión e inténtalo de nuevo.</p>
              </div>
            </div>
          </div>
          <Panel className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-8 w-full" />
          </Panel>
        </div>
      </Section>
    </div>
  );
}
