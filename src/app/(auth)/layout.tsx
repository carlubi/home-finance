import { BrandLogo } from "@/components/layout/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-muted/40 p-4">
      {/* Blobs decorativos animados */}
      <div
        aria-hidden
        className="auth-blob pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="auth-blob pointer-events-none absolute -right-20 -bottom-24 size-80 rounded-full bg-[oklch(0.62_0.2_330/0.14)] blur-3xl [animation-delay:-4s]"
      />

      <div className="hover-wiggle z-10 flex items-center">
        <BrandLogo className="h-16" />
      </div>
      <div className="animate-pop-in z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}
