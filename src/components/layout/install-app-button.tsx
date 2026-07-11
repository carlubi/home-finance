"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS moderno se identifica como Mac pero tiene pantalla táctil
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

const noopSubscribe = () => () => {};

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [iosHelpOpen, setIosHelpOpen] = useState(false);
  const [installedNow, setInstalledNow] = useState(false);
  // Valores solo-cliente sin desajustes de hidratación
  const ios = useSyncExternalStore(noopSubscribe, isIos, () => false);
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

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin SW el navegador puede no ofrecer instalación, pero no rompemos la UI.
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  // En iOS Safari no existe beforeinstallprompt: mostramos instrucciones.
  const canNativePrompt = deferredPrompt !== null;
  if (installed || (!canNativePrompt && !ios)) return null;

  async function install() {
    if (!canNativePrompt) {
      setIosHelpOpen(true);
      return;
    }
    const prompt = deferredPrompt!;
    setDeferredPrompt(null);
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") {
      toast.success("Aplicación instalada.");
    } else {
      toast.message("Instalación cancelada.");
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
        <Download className="size-5" />
      </Button>

      <Dialog open={iosHelpOpen} onOpenChange={setIosHelpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Instalar en tu iPhone o iPad</DialogTitle>
            <DialogDescription>
              Safari no muestra un botón de instalación, pero puedes añadir la app
              en dos pasos:
            </DialogDescription>
          </DialogHeader>
          <ol className="grid gap-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Share className="size-4" />
              </span>
              <span>
                Toca el botón <strong>Compartir</strong> en la barra de Safari.
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <SquarePlus className="size-4" />
              </span>
              <span>
                Elige <strong>Añadir a pantalla de inicio</strong> y confirma.
              </span>
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            La app se abrirá a pantalla completa, con su propio icono, como
            cualquier otra aplicación.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
