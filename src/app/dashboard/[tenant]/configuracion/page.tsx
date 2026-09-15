import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { ProfileForm } from "./profile-form";
import { PublishToggle } from "./publish-toggle";
import { GalleryUploader, LogoCoverUploader } from "./media-uploader";
import { SubscriptionPaymentForm } from "./subscription-payment-form";

const STATUS_LABELS: Record<string, string> = {
  trial: "Prueba",
  active: "Activa",
  past_due: "Vencida",
  grace: "Periodo de gracia",
  suspended: "Suspendida",
};

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const { supabase, barbershop, canManage } = await getTenantContext(tenant);

  if (!canManage) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-500">
        No tienes acceso a esta sección.
      </div>
    );
  }

  const [{ data: galleryRows }, { data: subscription }] = await Promise.all([
    supabase
      .from("gallery_images")
      .select("id, storage_path")
      .eq("tenant_id", barbershop.id)
      .order("sort_order"),
    supabase
      .from("subscriptions")
      .select("*, plans(name, price_cents, currency)")
      .eq("tenant_id", barbershop.id)
      .maybeSingle(),
  ]);

  const images = (galleryRows ?? []).map((img) => ({
    ...img,
    url: supabase.storage.from("barbershop-media").getPublicUrl(img.storage_path).data.publicUrl,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Configuración</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enlace público: <span className="font-mono">barbertech.app/{barbershop.slug}</span>
        </p>
      </div>

      <PublishToggle tenant={tenant} isPublished={barbershop.is_published} />

      <ProfileForm
        tenant={tenant}
        initial={{
          name: barbershop.name,
          description: barbershop.description ?? "",
          phone: barbershop.phone ?? "",
          whatsapp: barbershop.whatsapp ?? "",
          address: barbershop.address ?? "",
        }}
      />

      <LogoCoverUploader
        tenantId={barbershop.id}
        logoUrl={barbershop.logo_url}
        coverUrl={barbershop.cover_url}
      />

      <GalleryUploader tenant={tenant} tenantId={barbershop.id} images={images} />

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-semibold text-neutral-900">Suscripción</p>
        {subscription ? (
          <div className="mt-2 text-sm text-neutral-600">
            <p>
              Plan: <span className="font-medium text-neutral-900">{subscription.plans?.name}</span>
            </p>
            <p>
              Estado:{" "}
              <span className="font-medium text-neutral-900">
                {STATUS_LABELS[subscription.status] ?? subscription.status}
              </span>
            </p>
            {subscription.trial_ends_at && (
              <p>
                Prueba hasta:{" "}
                {new Date(subscription.trial_ends_at).toLocaleDateString("es-DO")}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">Sin suscripción registrada.</p>
        )}
        <div className="mt-3 border-t border-neutral-100 pt-3">
          <SubscriptionPaymentForm tenant={tenant} />
        </div>
      </div>
    </div>
  );
}
