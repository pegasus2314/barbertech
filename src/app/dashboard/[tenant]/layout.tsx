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
    <div className="flex min-h-screen flex-col bg-neutral-50 sm:flex-row">
      <div className="flex flex-col border-neutral-200 bg-white sm:w-60 sm:shrink-0 sm:border-r">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-neutral-900">{barbershop.name}</p>
            <p className="text-xs capitalize text-neutral-400">{role}</p>
          </div>
          <div className="sm:hidden">
            <SignOutButton />
          </div>
        </div>
        <DashboardNav tenant={tenant} />
        <div className="hidden px-4 py-4 sm:mt-auto sm:block">
          <SignOutButton />
        </div>
      </div>
      <main className="flex-1 px-4 py-6 sm:px-10 sm:py-10">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
