"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, MonitorDown, Share, SquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS moderno se identifica como Mac pero tiene pantalla táctil
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

function isDesktop() {
  if (typeof navigator === "undefined") return false;
  return !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !isIos();
}

function isMacSafari() {
  if (typeof navigator === "undefined") return false;
  return isDesktop() && /Macintosh/.test(navigator.userAgent) &&
    /Safari/.test(navigator.userAgent) &&
    !/Chrome|Chromium|CriOS|Edg|OPR/.test(navigator.userAgent);
}

function isStandalone() {
  const nav = navigator as NavigatorWithStandalone;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    nav.standalone === true
  );
}

const noopSubscribe = () => () => {};

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [installedNow, setInstalledNow] = useState(false);
  // Valores solo-cliente sin desajustes de hidratación
  const ios = useSyncExternalStore(noopSubscribe, isIos, () => false);
  const desktop = useSyncExternalStore(noopSubscribe, isDesktop, () => false);
  const macSafari = useSyncExternalStore(noopSubscribe, isMacSafari, () => false);
  const standalone = useSyncExternalStore(noopSubscribe, isStandalone, () => true);
  const installed = installedNow || standalone;

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalledNow(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  // El aviso nativo no está disponible en todos los navegadores de escritorio.
  const canNativePrompt = deferredPrompt !== null;
  if (installed || (!canNativePrompt && !ios && !desktop)) return null;

  async function install() {
    if (!canNativePrompt) {
      setHelpOpen(true);
      return;
    }
    const prompt = deferredPrompt!;
    setDeferredPrompt(null);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") {
        toast.success("Aplicación instalada.");
      } else {
        toast.message("Instalación cancelada.");
      }
    } catch {
      setHelpOpen(true);
    }
  }

  return (
    <>
      {/* Escritorio: botón con texto · Móvil: icono compacto */}
      <Button
        variant="outline"
        size="sm"
        className="hidden md:inline-flex"
        onClick={install}
      >
        <Download className="size-4" />
        Instalar app
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Instalar la aplicación"
        title="Instalar la aplicación"
        onClick={install}
      >
        <Download className="size-4" />
      </Button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-sm">
          <div className="flex items-center gap-3 rounded-lg border border-border-primary bg-bg-tertiary/50 p-3">
            <BrandMark variant="dark" className="size-12 drop-shadow-sm" />
            <div className="grid">
              <span className="text-sm font-medium text-text-primary">Home Brain</span>
              <span className="text-xs text-text-tertiary">
                {ios ? "Así aparecerá en tu pantalla de inicio" : "Así aparecerá en tu escritorio"}
              </span>
            </div>
          </div>
          <DialogHeader>
            <DialogTitle>
              {ios ? "Instalar en tu iPhone o iPad" : "Instalar en el escritorio"}
            </DialogTitle>
            <DialogDescription>
              {ios
                ? "Añade Home Brain a tu pantalla de inicio desde el navegador:"
                : "Añade Home Brain como aplicación desde el navegador:"}
            </DialogDescription>
          </DialogHeader>
          <ol className="grid gap-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-md border border-border-primary bg-bg-tertiary text-text-secondary">
                {ios ? <Share className="size-4" /> : <MonitorDown className="size-4" />}
              </span>
              <span>
                {ios ? (
                  <>Toca <strong>Compartir</strong> en la barra del navegador.</>
                ) : macSafari ? (
                  <>En Safari, abre <strong>Archivo → Añadir al Dock</strong>.</>
                ) : (
                  <>Abre el menú del navegador y busca <strong>Instalar Home Brain</strong> o <strong>Instalar página como aplicación</strong>.</>
                )}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-md border border-border-primary bg-bg-tertiary text-text-secondary">
                <SquarePlus className="size-4" />
              </span>
              <span>
                {ios ? (
                  <>Elige <strong>Añadir a pantalla de inicio</strong> y confirma.</>
                ) : (
                  <>Confirma la instalación. Podrás abrir la app desde el escritorio o el menú de aplicaciones.</>
                )}
              </span>
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            {ios
              ? "La app se abrirá con su propio icono, como cualquier otra aplicación."
              : "La instalación requiere abrir la web con HTTPS o en localhost. Si no ves la opción, prueba con Chrome, Edge o Safari en Mac."}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
