"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { Budget, Category } from "@/lib/types";
import {
  FAMILY_EXPENSE_CATEGORIES,
  familyCategoryColor,
  type FamilyExpenseCategoryOption,
} from "@/lib/family";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createFamilyCategory,
  createCategory,
  deleteBudget,
  deleteCategory,
  deleteFamilyCategory,
  saveBudget,
} from "./actions";

const COLOR_CHOICES = [
  "#2a78d6",
  "#1baf7a",
  "#eda100",
  "#008300",
  "#4a3aa7",
  "#e34948",
  "#e87ba4",
  "#eb6834",
  "#898781",
];

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const [pending, startTransition] = useTransition();
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const own = categories.filter((c) => c.user_id !== null);

  return (
    <div className="grid gap-4">
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            formData.set("color", color);
            const r = await createCategory(formData);
            if (r.error) toast.error(r.error);
            else {
              formRef.current?.reset();
              toast.success("Categoría creada.");
              router.refresh();
            }
        })
      }
        className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
      >
        <Input className="w-full" name="name" placeholder="Nombre de la categoría" required />
        <Select name="kind" defaultValue="expense" items={[
          { value: "expense", label: "Gasto" },
          { value: "income", label: "Ingreso" },
          { value: "investment", label: "Inversión" },
        ]}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Gasto</SelectItem>
            <SelectItem value="income">Ingreso</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          {COLOR_CHOICES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onClick={() => setColor(c)}
              className="size-6 rounded-full border-2"
              style={{
                backgroundColor: c,
                borderColor: color === c ? "var(--foreground)" : "transparent",
              }}
            />
          ))}
        </div>
        <Button type="submit" disabled={pending}>
          Añadir
        </Button>
      </form>

      {own.length > 0 && (
        <ul className="grid gap-1.5">
          {own.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: c.color ?? "#898781" }}
              />
              {c.name}
              <Badge variant="outline">
                {c.kind === "expense" ? "Gasto" : c.kind === "income" ? "Ingreso" : "Inversión"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto size-7"
                onClick={() =>
                  startTransition(async () => {
                    const r = await deleteCategory(c.id);
                    if (r.error) toast.error(r.error);
                    else router.refresh();
                  })
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FamilyCategoriesManager({
  categories,
}: {
  categories: FamilyExpenseCategoryOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <div className="grid gap-4">
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            formData.set("color", color);
            const result = await createFamilyCategory(formData);
            if (result.error) toast.error(result.error);
            else {
              formRef.current?.reset();
              toast.success("Categoría familiar creada.");
              router.refresh();
            }
          })
        }
        className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
      >
        <Input
          className="w-full"
          name="name"
          placeholder="Ej. Colegio"
          required
        />
        <div className="flex items-center gap-1">
          {COLOR_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              aria-label={`Color ${choice}`}
              onClick={() => setColor(choice)}
              className="size-6 rounded-full border-2"
              style={{
                backgroundColor: choice,
                borderColor: color === choice ? "var(--foreground)" : "transparent",
              }}
            />
          ))}
        </div>
        <Button type="submit" disabled={pending}>
          Añadir
        </Button>
      </form>

      <div className="grid gap-2">
        <p className="text-xs text-muted-foreground">Categorías estándar</p>
        <div className="flex flex-wrap gap-1.5">
          {FAMILY_EXPENSE_CATEGORIES.map((category) => (
            <Badge key={category} variant="outline" className="gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: familyCategoryColor(category) }}
              />
              {category}
            </Badge>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="grid gap-2">
          <p className="text-xs text-muted-foreground">Tus categorías personalizadas</p>
          <ul className="grid gap-1.5">
            {categories.map((category) => (
              <li key={category.id ?? category.name} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: category.color ?? "#898781" }}
                />
                {category.name}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-7"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      if (!category.id) return;
                      const result = await deleteFamilyCategory(category.id);
                      if (result.error) toast.error(result.error);
                      else {
                        toast.success("Categoría familiar eliminada.");
                        router.refresh();
                      }
                    })
                  }
                  aria-label={`Eliminar ${category.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function BudgetsManager({
  budgets,
  categories,
}: {
  budgets: Budget[];
  categories: Category[];
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <div className="grid gap-4">
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            const r = await saveBudget(formData);
            if (r.error) toast.error(r.error);
            else {
              formRef.current?.reset();
              toast.success("Presupuesto guardado.");
              router.refresh();
            }
        })
      }
        className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
      >
        <Select
          name="category_id"
          items={categories.map((c) => ({ value: c.id, label: c.name }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="w-full"
          name="monthly_limit"
          type="number"
          min="1"
          step="0.01"
          placeholder="Límite €/mes"
          required
        />
        <Button type="submit" disabled={pending}>
          Guardar
        </Button>
      </form>

      {budgets.length > 0 && (
        <ul className="grid gap-1.5">
          {budgets.map((b) => (
            <li key={b.id} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: b.categories?.color ?? "#898781" }}
              />
              {b.categories?.name ?? "Categoría"}
              <span className="ml-auto tabular-nums">
                {formatMoney(b.monthly_limit)}/mes
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() =>
                  startTransition(async () => {
                    const r = await deleteBudget(b.id);
                    if (r.error) toast.error(r.error);
                    else router.refresh();
                  })
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
