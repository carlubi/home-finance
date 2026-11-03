import { BrandLogo } from "@/components/layout/brand-logo";
import { InstallAppButton } from "@/components/layout/install-app-button";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-8 bg-bg-primary p-4">
      <div className="absolute top-4 right-4">
        <InstallAppButton />
      </div>
      <BrandLogo size="md" />
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
