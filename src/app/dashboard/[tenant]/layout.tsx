import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { getAccessState, graceDaysLeft } from "@/lib/subscription/access";
import { SignOutButton } from "../sign-out-button";
import { DashboardNav } from "./nav";
import { NotificationBell } from "./notification-bell";
import { SubscriptionPaymentForm } from "./configuracion/subscription-payment-form";
import { BankTransferDetails } from "@/components/bank-transfer-details";

export default async function TenantDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const { supabase, barbershop, role, canManage } = await getTenantContext(tenant);

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at, current_period_end")
    .eq("tenant_id", barbershop.id)
    .maybeSingle();

  const access = getAccessState({
    barbershopStatus: barbershop.status,
    subscriptionStatus: subscription?.status ?? null,
    trialEndsAt: subscription?.trial_ends_at ?? null,
    currentPeriodEnd: subscription?.current_period_end ?? null,
  });

  if (access === "blocked") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f2] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#e7e3da] bg-white p-8 text-center shadow-[0_8px_30px_rgba(23,23,23,0.04)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff3d9] text-xl">⏸</div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-neutral-950">Suscripción vencida</h1>
          <p className="mt-2 text-sm text-neutral-500">
            El acceso de <span className="font-semibold text-neutral-800">{barbershop.name}</span> está en
            pausa porque no hay un pago de suscripción activo. Tu página pública también está desactivada
            mientras tanto.
          </p>
          {canManage ? (
            <div className="mt-6 space-y-4 text-left">
              <BankTransferDetails />
              <div className="rounded-xl border border-[#e7e3da] bg-[#f7f6f2] p-4">
                <SubscriptionPaymentForm tenant={tenant} />
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-neutral-500">Pídele al dueño de la barbería que renueve la suscripción.</p>
          )}
          <div className="mt-4">
            <SignOutButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-neutral-950 sm:flex">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-[#e7e3da] bg-[#171717] text-white sm:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c7a15a] text-lg font-bold text-[#171717]">
              {barbershop.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{barbershop.name}</p>
              <p className="mt-0.5 text-xs capitalize text-white/50">{role}</p>
            </div>
            <NotificationBell tenant={tenant} tenantId={barbershop.id} variant="dark" />
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
            <div className="flex items-center gap-1">
              <NotificationBell tenant={tenant} tenantId={barbershop.id} />
              <SignOutButton />
            </div>
          </div>
          <DashboardNav tenant={tenant} />
        </header>

        <main className="px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            {access === "grace" && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e7cf94] bg-[#fffaf0] px-5 py-4">
                <p className="text-sm text-[#7f602d]">
                  <span className="font-semibold">Tu suscripción venció.</span> Tienes{" "}
                  {graceDaysLeft(subscription!.current_period_end ?? subscription!.trial_ends_at!)} días para
                  registrar tu pago antes de que se pause el acceso.
                </p>
                {canManage && <SubscriptionPaymentForm tenant={tenant} />}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
