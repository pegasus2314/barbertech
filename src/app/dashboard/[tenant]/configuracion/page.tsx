import { getTenantContext } from "@/lib/tenant/get-tenant-context";
import { ProfileForm } from "./profile-form";
import { PublishToggle } from "./publish-toggle";
import { GalleryUploader, LogoCoverUploader } from "./media-uploader";
import { SubscriptionPaymentForm } from "./subscription-payment-form";
import { BankTransferDetails } from "@/components/bank-transfer-details";
import { BookingLinkCard } from "./booking-link-card";
import { CARD } from "@/lib/ui";
import { siteUrl } from "@/lib/site-url";

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
      <div className={`${CARD} px-4 py-6 text-sm text-neutral-500`}>
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

  const base = siteUrl();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Negocio</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">Configuración</h1>
      </div>

      <PublishToggle tenant={tenant} isPublished={barbershop.is_published} />

      <BookingLinkCard
        storefrontUrl={`${base}/${barbershop.slug}`}
        bookingUrl={`${base}/${barbershop.slug}/reservar`}
      />

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

      <div className={`${CARD} p-5`}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Suscripción</p>
        {subscription ? (
          <div className="mt-3 text-sm text-neutral-600">
            <p>
              Plan: <span className="font-semibold text-neutral-900">{subscription.plans?.name}</span>
            </p>
            <p>
              Estado:{" "}
              <span className="font-semibold text-neutral-900">
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
          <p className="mt-3 text-sm text-neutral-500">Sin suscripción registrada.</p>
        )}
        <div className="mt-4 space-y-4 border-t border-[#eeeae2] pt-4">
          <BankTransferDetails />
          <SubscriptionPaymentForm tenant={tenant} />
        </div>
      </div>
    </div>
  );
}
