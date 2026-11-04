import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAppProfile, getCurrentUser } from "@/lib/auth";
import { BottomNav, CurrentSection, NavigationDockProvider, Sidebar, SidebarRevealButton } from "@/components/layout/nav";
import { InstallAppButton } from "@/components/layout/install-app-button";
import { NotificationsPermissionPrompt } from "@/components/layout/notifications-permission";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageMenuButton } from "@/components/layout/language-switcher";
import { FamilyLiveRefresh } from "@/components/layout/family-live-refresh";
import { FinancialPrivacyProvider } from "@/components/layout/financial-privacy";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateFamilyUnit } from "@/lib/family-unit";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getAppProfile(user.id);

  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }
  const familyUnit = await getOrCreateFamilyUnit(await createClient(), user);
  const initialDocked = (await cookies()).get("sidebar_docked")?.value !== "false";

  return (
    <NavigationDockProvider initialDocked={initialDocked}>
      <div className="flex h-svh w-full overflow-hidden bg-bg-primary">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="z-30 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border-primary bg-bg-primary/90 px-4 backdrop-blur-md md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <BrandLogo size="sm" withText={false} className="md:hidden" />
              <SidebarRevealButton />
              <CurrentSection />
            </div>
            <div className="flex items-center gap-0.5">
              <InstallAppButton />
              <NotificationsBell />
              <LanguageMenuButton />
              <UserMenu
                name={profile?.full_name ?? ""}
                email={user.email ?? ""}
              />
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-10">
            <FinancialPrivacyProvider>{children}</FinancialPrivacyProvider>
          </main>
        </div>
        <BottomNav />
        <NotificationsPermissionPrompt />
        {familyUnit && <FamilyLiveRefresh familyUnitId={familyUnit.id} />}
      </div>
    </NavigationDockProvider>
  );
}
