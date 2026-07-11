import { redirect } from "next/navigation";
import { getAppProfile, getCurrentUser } from "@/lib/auth";
import { BottomNav, Sidebar } from "@/components/layout/nav";
import { InstallAppButton } from "@/components/layout/install-app-button";
import { NotificationsPermissionPrompt } from "@/components/layout/notifications-permission";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { BrandLogo } from "@/components/layout/brand-logo";

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

  return (
    <div className="flex min-h-svh w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
          <div className="hover-wiggle flex items-center md:hidden">
            <BrandLogo className="h-9" />
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-1">
            <InstallAppButton />
            <NotificationsBell />
            <UserMenu
              name={profile?.full_name ?? ""}
              email={user.email ?? ""}
            />
          </div>
        </header>
        <main className="animate-fade-up flex-1 p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
      <NotificationsPermissionPrompt />
    </div>
  );
}
