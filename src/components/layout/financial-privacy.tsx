"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "home-brain:hide-financial-values";
const PrivacyContext = createContext({ hidden: false, toggle: () => {} });
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function isFinancialPage(pathname: string) {
  return pathname === "/" || [
    "/gastos-personales",
    "/presupuestos",
    "/familia",
    "/hipoteca",
    "/global",
    "/compartidos",
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function markNumericalText(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const value = node.textContent?.trim();
    if (!value) continue;
    const element = node.parentElement;
    if (!element || element.closest("h1, h2, h3, nav, button, label, option, textarea, script, style, [contenteditable], [data-privacy-control]")) continue;
    // Dates and years provide navigation context; amounts, rates and counts are private.
    const withoutDates = value
      .replace(/\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/g, "")
      .replace(/\b(?:19|20)\d{2}\b/g, "");
    if (!/\d|€/.test(withoutDates)) continue;
    if (element.children.length && ![...element.children].every((child) => ["SPAN", "STRONG", "EM", "SMALL", "B"].includes(child.tagName))) continue;
    element.classList.add("financial-privacy-value");
  }
}

export function FinancialPrivacyProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = isFinancialPage(pathname);
  const [hidden, setHidden] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const read = () => {
      try {
        setHidden(localStorage.getItem(STORAGE_KEY) === "true");
      } catch {
        setHidden(false);
      }
      setInitialized(true);
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!initialized) return;
    const main = document.querySelector("main");
    if (!main) return;
    document.documentElement.dataset.financialPrivacy = active && hidden ? "hidden" : "visible";
    main.dataset.financialPrivacy = active && hidden ? "hidden" : "visible";
    if (!active || !hidden) return;

    let frame = 0;
    const scan = () => {
      markNumericalText(main);
      document.querySelectorAll<HTMLElement>("[role='dialog']").forEach(markNumericalText);
      main.dataset.financialPrivacyReady = "true";
      delete document.documentElement.dataset.financialPrivacyPending;
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    };
    scan();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      delete main.dataset.financialPrivacyReady;
    };
  }, [active, hidden, initialized, pathname]);

  const toggle = () => {
    const next = !hidden;
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // El control sigue funcionando en la sesión aunque el navegador bloquee el almacenamiento.
    }
    setHidden(next);
  };

  return <PrivacyContext.Provider value={{ hidden, toggle }}>{children}</PrivacyContext.Provider>;
}

export function FinancialPrivacyButton() {
  const { hidden, toggle } = useContext(PrivacyContext);
  return (
    <Button type="button" variant="outline" size="sm" onClick={toggle} aria-label={hidden ? "Mostrar cifras" : "Ocultar cifras"} aria-pressed={hidden} title={hidden ? "Mostrar cifras" : "Ocultar cifras"} data-privacy-control>
      {hidden ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      <span className="hidden sm:inline">{hidden ? "Mostrar cifras" : "Ocultar cifras"}</span>
    </Button>
  );
}
