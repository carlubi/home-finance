import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAppProfile, getCurrentUser } from "@/lib/auth";
import { BottomNav, CurrentSection, NavigationDockProvider, Sidebar, SidebarRevealButton } from "@/components/layout/nav";
import { NotificationsPermissionPrompt } from "@/components/layout/notifications-permission";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageMenuButton } from "@/components/layout/language-switcher";
import { FamilyLiveRefresh } from "@/components/layout/family-live-refresh";
import { FinancialPrivacyProvider } from "@/components/layout/financial-privacy";
import { createClient } from "@/lib/supabase/server";
import { getFamilyAccess, getFamilyUnits, getOrCreateFamilyUnit } from "@/lib/family-unit";

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
  const supabase = await createClient();
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);
  const familyUnits = familyUnit ? await getFamilyUnits(supabase, user.id) : [];
  const family = familyUnit ? {
    unit: familyUnit,
    units: familyUnits,
    access: await getFamilyAccess(supabase, user.id, familyUnit),
    canCreate: familyUnits.filter((unit) => unit.owner_id === user.id).length < 3,
  } : null;
  const initialDocked = (await cookies()).get("sidebar_docked")?.value !== "false";

  return (
    <NavigationDockProvider initialDocked={initialDocked} family={family}>
      <div className="flex h-svh w-full overflow-hidden bg-bg-primary">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="z-30 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border-primary bg-bg-primary/90 px-4 backdrop-blur-md md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <BrandLogo size="sm" withText={false} className="md:hidden" />
              <SidebarRevealButton />
              <CurrentSection />
            </div>
            <div className="flex shrink-0 items-center gap-0.5 [&_[data-slot=button]]:size-10 md:[&_[data-slot=button]]:size-8">
              <NotificationsBell />
              <LanguageMenuButton />
              <UserMenu
                name={profile?.full_name ?? ""}
                email={user.email ?? ""}
              />
            </div>
          </header>
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pt-6 pb-[calc(6.5rem_+_env(safe-area-inset-bottom))] max-md:overflow-x-hidden md:px-8 md:pt-8 md:pb-10">
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
