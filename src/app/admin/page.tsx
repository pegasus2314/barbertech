import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";

const STATUS_COLORS: Record<string, string> = {
  trial: "bg-blue-50 text-blue-700",
  active: "bg-green-50 text-green-700",
  past_due: "bg-amber-50 text-amber-700",
  grace: "bg-amber-50 text-amber-700",
  suspended: "bg-red-50 text-red-700",
};

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase } = await requirePlatformAdmin();
  const { q } = await searchParams;

  let query = supabase
    .from("barbershops")
    .select("id, name, slug, status, is_published, created_at, plans(name)")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
  }

  const { data: barbershops } = await query.limit(100);

  const { count: pendingPayments } = await supabase
    .from("subscription_payments")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Barberías</h1>
          <p className="mt-1 text-sm text-neutral-500">{barbershops?.length ?? 0} registradas</p>
        </div>
        {pendingPayments ? (
          <Link
            href="/admin/pagos"
            className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
          >
            {pendingPayments} pago(s) pendiente(s)
          </Link>
        ) : null}
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o slug..."
          className="w-full max-w-sm rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          Buscar
        </button>
      </form>

      <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {(barbershops ?? []).map((b) => (
          <Link
            key={b.id}
            href={`/admin/${b.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
          >
            <div>
              <p className="text-sm font-medium text-neutral-900">{b.name}</p>
              <p className="text-xs text-neutral-500">
                /{b.slug} · {b.plans?.name ?? "Sin plan"}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[b.status] ?? "bg-neutral-100 text-neutral-600"}`}
            >
              {b.status}
            </span>
          </Link>
        ))}
        {(barbershops ?? []).length === 0 && (
          <p className="px-4 py-6 text-sm text-neutral-500">No hay barberías.</p>
        )}
      </div>
    </div>
  );
}
