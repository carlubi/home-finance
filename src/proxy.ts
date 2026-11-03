import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Excluye estáticos y los archivos de la PWA (manifest, service worker,
    // página offline y cron protegido con CRON_SECRET: no usan sesión de usuario.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|api/cron/stockalert-expiry|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
