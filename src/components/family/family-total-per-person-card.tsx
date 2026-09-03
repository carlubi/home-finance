"use client";

import { useState, useTransition } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { saveFamilyPeopleCount } from "@/app/(app)/familia/actions";
import { formatMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FamilyTotalPerPersonCard({
  total,
  initialPeopleCount,
}: {
  total: number;
  initialPeopleCount: number;
}) {
  const [peopleCount, setPeopleCount] = useState(initialPeopleCount);
  const [pending, startTransition] = useTransition();

  function changePeopleCount(value: string | null) {
    const nextPeopleCount = Number(value);
    if (!Number.isInteger(nextPeopleCount) || nextPeopleCount < 1) return;
    const previousPeopleCount = peopleCount;
    setPeopleCount(nextPeopleCount);
    startTransition(async () => {
      const result = await saveFamilyPeopleCount(nextPeopleCount);
      if (result.error) {
        setPeopleCount(previousPeopleCount);
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="card-lift relative">
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Dividir entre</span>
        <Select
          value={String(peopleCount)}
          onValueChange={changePeopleCount}
          disabled={pending}
        >
          <SelectTrigger
            size="sm"
            className="w-[8.5rem] shrink-0"
            aria-label="Número de personas entre las que dividir el total"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3].map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} {option === 1 ? "persona" : "personas"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <CardContent className="flex min-w-0 items-start gap-3 pt-0">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Users className="size-4.5" />
        </span>
        <div className="grid min-w-0 flex-1 gap-1.5">
          <div className="grid min-w-0 gap-1.5">
            <p className="text-sm text-muted-foreground">Total por persona</p>
            <p className="truncate text-2xl font-bold tabular-nums">
              {formatMoney(total / peopleCount)}
            </p>
            <p className="text-xs text-muted-foreground">
              Total dividido entre {peopleCount} {peopleCount === 1 ? "persona" : "personas"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
