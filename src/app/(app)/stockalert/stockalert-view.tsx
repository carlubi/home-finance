"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, Camera, Check, Clock3, Package, Pencil, Plus, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteProduct, saveProduct, setProductStatus, type ProductInput } from "./actions";

export type StockProduct = {
  id: string; name: string; brand: string | null; units: number | null;
  expiration_date: string | null; confidence: number; needs_review: boolean;
  status: "pending" | "active" | "archived"; created_at: string;
};

type Draft = ProductInput & { id?: string };
type ProductAction = { product: StockProduct; kind: "delete" | "archive" | "restore" };
const emptyDraft: Draft = { name: "", brand: "", units: 1, expiration_date: "" };

function daysUntil(date: string | null) {
  if (!date) return Infinity;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86400000);
}

function expirationLabel(date: string | null) {
  const days = daysUntil(date);
  if (!Number.isFinite(days)) return "Fecha por revisar";
  if (days < 0) return `Caducó hace ${Math.abs(days)} ${Math.abs(days) === 1 ? "día" : "días"}`;
  if (days === 0) return "Caduca hoy";
  if (days === 1) return "Caduca mañana";
  return `Caduca en ${days} días`;
}

function urgencyClass(date: string | null) {
  const days = daysUntil(date);
  if (days <= 0) return "text-red";
  if (days <= 5) return "text-orange";
  if (days <= 10) return "text-yellow";
  return "text-text-secondary";
}

export function StockAlertView({ products, loadError, canEdit = true }: { products: StockProduct[]; loadError: string | null; canEdit?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [view, setView] = useState<"active" | "archived">("active");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [originalDraft, setOriginalDraft] = useState<Draft | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [productAction, setProductAction] = useState<ProductAction | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const active = products.filter((product) => product.status === "active");
  const awaiting = products.filter((product) => product.status === "pending");
  const visible = products.filter((product) => product.status === view);
  const soon = active.filter((product) => { const days = daysUntil(product.expiration_date); return days > 0 && days <= 5; }).length;
  const today = active.filter((product) => daysUntil(product.expiration_date) <= 0).length;
  const draftChanged = !!draft && !!originalDraft && (Object.keys(originalDraft) as (keyof Draft)[]).some((key) => draft[key] !== originalDraft[key]);

  function openDraft(next: Draft) {
    setOriginalDraft(next);
    setDraft(next);
  }

  function closeDraft() {
    if (pending) return;
    if (draftChanged) setLeaveOpen(true);
    else setDraft(null);
  }

  function run(operation: () => Promise<{ error?: string; ok?: boolean }>, success: string, close: boolean | (() => void) = false) {
    startTransition(async () => {
      try {
        const result = await operation();
        if (result.error) { toast.error(result.error); return; }
        toast.success(success);
        if (typeof close === "function") close();
        else if (close) { setDraft(null); setLeaveOpen(false); }
        router.refresh();
      } catch { toast.error("No se pudo completar la operación."); }
    });
  }

  async function onPhoto(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error("Usa una foto JPG, PNG o WebP de hasta 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const response = await fetch("/api/stockalert/analyze", { method: "POST", body: form });
      const result = await response.json() as { error?: string; needs_review?: boolean };
      if (!response.ok) throw new Error(result.error ?? "No se pudo analizar la foto.");
      toast.success(result.needs_review ? "Foto procesada. Completa los datos pendientes." : "Foto procesada. Revisa y confirma el producto.");
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo analizar la foto."); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
      <PageHeader eyebrow="DESPENSA" title="StockAlert" description="Tus productos y sus fechas de caducidad, siempre a la vista."
        actions={canEdit ? <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openDraft({ ...emptyDraft })}><Plus className="size-4" /> Añadir manualmente</Button>
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}><Camera className="size-4" /> {uploading ? "Analizando foto…" : "Añadir con foto"}</Button>
          <input ref={inputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Foto del producto" onChange={(event) => void onPhoto(event.target.files?.[0])} />
        </div> : <span className="text-[13px] text-text-secondary">Solo lectura</span>} />

      {loadError && <div role="alert" className="rounded-lg border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">No se pudo cargar la despensa: {loadError}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric icon={Package} value={active.length} label="Productos activos" tone="text-text-primary" />
        <Metric icon={Clock3} value={soon} label="Caducan en 5 días" tone="text-orange" />
        <Metric icon={TriangleAlert} value={today} label="Caducan hoy o caducados" tone="text-red" />
      </div>

      {awaiting.length > 0 && <section className="rounded-xl border border-yellow/30 bg-yellow/5 p-4 sm:p-5" aria-labelledby="pending-title">
        <div className="mb-4 flex items-center gap-2"><Clock3 className="size-4 text-yellow" /><h2 id="pending-title" className="text-sm font-semibold text-text-primary">Pendientes de confirmar</h2><span className="rounded-full bg-yellow/15 px-2 py-0.5 text-xs text-yellow">{awaiting.length}</span></div>
        <div className="grid gap-2 md:grid-cols-2">{awaiting.map((product) => <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-primary bg-bg-secondary p-3">
          <div className="min-w-0"><p className="truncate text-sm font-medium text-text-primary">{product.name}</p><p className="text-xs text-text-secondary">{product.needs_review ? "Faltan datos por revisar" : expirationLabel(product.expiration_date)}</p></div>
          {canEdit && <div className="flex shrink-0 gap-1"><Button size="sm" variant="outline" onClick={() => openDraft(fromProduct(product))}><Pencil className="size-3.5" /> Revisar</Button><Button size="icon-sm" variant="ghost" aria-label={`Eliminar ${product.name}`} onClick={() => setProductAction({ product, kind: "delete" })}><Trash2 className="size-4 text-red" /></Button></div>}
        </div>)}</div>
      </section>}

      <section aria-labelledby="inventory-title" className="overflow-hidden rounded-xl border border-border-primary bg-bg-secondary">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-primary px-4 py-4 sm:px-5">
          <div><h2 id="inventory-title" className="text-sm font-semibold text-text-primary">Inventario</h2><p className="mt-0.5 text-xs text-text-tertiary">Controla lo que tienes y lo que ya has gastado.</p></div>
          <div className="flex rounded-md bg-bg-tertiary p-0.5" role="tablist" aria-label="Vista del inventario">
            {(["active", "archived"] as const).map((tab) => <button key={tab} type="button" role="tab" aria-selected={view === tab} onClick={() => setView(tab)} className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${view === tab ? "bg-bg-secondary text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}>{tab === "active" ? "Activos" : "Archivados"}</button>)}
          </div>
        </div>
        {visible.length ? <div className="divide-y divide-border-primary">{visible.map((product) => <article key={product.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap sm:px-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary"><Package className="size-4 text-text-tertiary" /></div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-text-primary">{product.name}</p><p className="text-xs text-text-tertiary">{product.brand || "Sin marca"} · {product.units ?? "?"} {product.units === 1 ? "unidad" : "unidades"}</p></div>
          <div className="min-w-32 text-right sm:text-left"><p className="text-xs text-text-secondary">{product.expiration_date ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${product.expiration_date}T12:00:00`)) : "Sin fecha"}</p><p className={`text-xs font-medium ${view === "archived" ? "text-text-tertiary" : urgencyClass(product.expiration_date)}`}>{view === "archived" ? "Archivado" : expirationLabel(product.expiration_date)}</p></div>
          {canEdit && <div className="ml-auto flex gap-1 sm:ml-0"><Button size="icon-sm" variant="ghost" aria-label={`Editar ${product.name}`} onClick={() => openDraft(fromProduct(product))}><Pencil className="size-4" /></Button><Button size="icon-sm" variant="ghost" aria-label={view === "active" ? `Archivar ${product.name}` : `Restaurar ${product.name}`} onClick={() => setProductAction({ product, kind: view === "active" ? "archive" : "restore" })}>{view === "active" ? <Archive className="size-4" /> : <RotateCcw className="size-4" />}</Button><Button size="icon-sm" variant="ghost" aria-label={`Eliminar ${product.name}`} onClick={() => setProductAction({ product, kind: "delete" })}><Trash2 className="size-4 text-red" /></Button></div>}
        </article>)}</div> : <div className="flex flex-col items-center px-6 py-16 text-center"><Package className="mb-3 size-8 text-text-tertiary" /><p className="text-sm font-medium text-text-primary">{view === "active" ? "Tu despensa está vacía" : "No hay productos archivados"}</p><p className="mt-1 text-xs text-text-secondary">{view === "active" ? "Añade un producto manualmente o hazle una foto." : "Los productos gastados aparecerán aquí."}</p></div>}
      </section>

      <Dialog open={draft !== null} onOpenChange={(open) => { if (!open) closeDraft(); }}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{draft?.id ? "Revisar producto" : "Añadir producto"}</DialogTitle><DialogDescription>Guarda el nombre, las unidades y la fecha de caducidad.</DialogDescription></DialogHeader>
          {draft && <form ref={formRef} className="grid gap-4" onSubmit={(event) => { event.preventDefault(); run(() => saveProduct(draft, draft.id), draft.id ? "Producto actualizado." : "Producto añadido.", true); }}>
            <div className="grid gap-1.5"><Label htmlFor="stock-name">Producto</Label><Input id="stock-name" maxLength={180} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></div>
            <div className="grid gap-1.5"><Label htmlFor="stock-brand">Marca (opcional)</Label><Input id="stock-brand" maxLength={120} value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3"><div className="grid gap-1.5"><Label htmlFor="stock-units">Unidades</Label><Input id="stock-units" type="number" min={1} max={9999} step={1} value={draft.units || ""} onChange={(event) => setDraft({ ...draft, units: Number(event.target.value) })} required /></div><div className="grid gap-1.5"><Label htmlFor="stock-date">Caducidad</Label><Input id="stock-date" type="date" value={draft.expiration_date} onChange={(event) => setDraft({ ...draft, expiration_date: event.target.value })} required /></div></div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={closeDraft} disabled={pending}>Cancelar</Button><Button type="submit" disabled={pending}><Check className="size-4" /> {pending ? "Guardando…" : "Guardar producto"}</Button></div>
          </form>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={productAction !== null} onOpenChange={(open) => { if (!open && !pending) setProductAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className={productAction?.kind === "delete" ? "border-red/20 bg-red/10 text-red" : undefined}>
              {productAction?.kind === "delete" ? <Trash2 /> : productAction?.kind === "archive" ? <Archive /> : <RotateCcw />}
            </AlertDialogMedia>
            <AlertDialogTitle>{productAction?.kind === "delete" ? "¿Eliminar producto?" : productAction?.kind === "archive" ? "¿Archivar producto?" : "¿Restaurar producto?"}</AlertDialogTitle>
            <AlertDialogDescription>{productAction?.kind === "delete" ? `«${productAction.product.name}» se eliminará definitivamente del inventario.` : productAction?.kind === "archive" ? `«${productAction?.product.name}» pasará a Archivados. Podrás restaurarlo cuando quieras.` : `«${productAction?.product.name}» volverá a tus productos activos.`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button variant={productAction?.kind === "delete" ? "destructive" : "default"} disabled={pending} onClick={() => {
              if (!productAction) return;
              const { product, kind } = productAction;
              run(() => kind === "delete" ? deleteProduct(product.id) : setProductStatus(product.id, kind === "archive" ? "archived" : "active"), kind === "delete" ? "Producto eliminado." : kind === "archive" ? "Producto archivado." : "Producto restaurado.", () => setProductAction(null));
            }}>{pending ? "Procesando…" : productAction?.kind === "delete" ? "Eliminar" : productAction?.kind === "archive" ? "Archivar" : "Restaurar"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveOpen} onOpenChange={(open) => { if (!pending) setLeaveOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Guardar los cambios?</AlertDialogTitle>
            <AlertDialogDescription>Has modificado este producto. Guarda los cambios antes de salir o descártalos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Seguir editando</AlertDialogCancel>
            <Button variant="outline" disabled={pending} onClick={() => { setLeaveOpen(false); setDraft(null); }}>Descartar</Button>
            <Button disabled={pending} onClick={() => formRef.current?.requestSubmit()}>{pending ? "Guardando…" : "Guardar cambios"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function fromProduct(product: StockProduct): Draft {
  return { id: product.id, name: product.name === "Producto por identificar" ? "" : product.name, brand: product.brand ?? "", units: product.units ?? 1, expiration_date: product.expiration_date ?? "" };
}

function Metric({ icon: Icon, value, label, tone }: { icon: typeof Package; value: number; label: string; tone: string }) {
  return <div className="rounded-xl border border-border-primary bg-bg-secondary p-4 sm:p-5"><div className="flex items-center gap-2 text-text-tertiary"><Icon className="size-4" /><span className="text-xs font-medium">{label}</span></div><p className={`mt-3 text-3xl font-semibold tabular-nums ${tone}`}>{value}</p></div>;
}
