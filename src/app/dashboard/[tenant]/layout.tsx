import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { SignOutButton } from "../sign-out-button";
import { DashboardNav } from "./nav";

export default async function TenantDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const { barbershop, role } = await getTenantContext(tenant);

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-neutral-950 sm:flex">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-[#e7e3da] bg-[#171717] text-white sm:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c7a15a] text-lg font-bold text-[#171717]">
              {barbershop.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{barbershop.name}</p>
              <p className="mt-0.5 text-xs capitalize text-white/50">{role}</p>
            </div>
          </div>
        </div>
        <DashboardNav tenant={tenant} />
        <div className="mt-auto border-t border-white/10 px-5 py-5">
          <SignOutButton variant="dark" />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[#e7e3da] bg-[#f7f6f2]/95 backdrop-blur sm:hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#171717] text-sm font-bold text-[#f5d89a]">
                {barbershop.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{barbershop.name}</p>
                <p className="text-[11px] capitalize text-neutral-500">{role}</p>
              </div>
            </div>
            <SignOutButton />
          </div>
          <DashboardNav tenant={tenant} />
        </header>

        <main className="px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
