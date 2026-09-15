"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteGalleryImage } from "./actions";
import { CARD } from "@/lib/ui";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function validate(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Formato no permitido (usa JPG, PNG, WEBP o GIF).";
  if (file.size > MAX_SIZE) return "La imagen no puede pesar más de 5MB.";
  return null;
}

export function LogoCoverUploader({
  tenantId,
  logoUrl,
  coverUrl,
}: {
  tenantId: string;
  logoUrl: string | null;
  coverUrl: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  async function handleUpload(kind: "logo" | "cover", file: File | undefined) {
    if (!file) return;
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(kind);

    const supabase = createClient();
    const path = `${tenantId}/${kind}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("barbershop-media")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(null);
      return;
    }

    const { data: publicUrl } = supabase.storage.from("barbershop-media").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("barbershops")
      .update(kind === "logo" ? { logo_url: publicUrl.publicUrl } : { cover_url: publicUrl.publicUrl })
      .eq("id", tenantId);

    setUploading(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  async function handleRemove(kind: "logo" | "cover") {
    setError(null);
    setUploading(kind);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("barbershops")
      .update(kind === "logo" ? { logo_url: null } : { cover_url: null })
      .eq("id", tenantId);

    setUploading(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className={`${CARD} p-5`}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Logo y portada</p>
      <div className="mt-4 flex flex-wrap gap-6">
        <div>
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-[#f7f6f2]">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-neutral-400">Logo</span>
            )}
          </div>
          <input
            ref={logoInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleUpload("logo", e.target.files?.[0])}
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => logoInput.current?.click()}
              disabled={uploading !== null}
              className="text-xs font-semibold text-[#9d7837] hover:text-[#7f602d] disabled:opacity-50"
            >
              {uploading === "logo" ? "Subiendo..." : "Cambiar logo"}
            </button>
            {logoUrl && (
              <button
                onClick={() => handleRemove("logo")}
                disabled={uploading !== null}
                className="text-xs font-medium text-neutral-400 hover:text-red-600 disabled:opacity-50"
              >
                Quitar
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-xl bg-[#f7f6f2]">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="Portada" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-neutral-400">Portada</span>
            )}
          </div>
          <input
            ref={coverInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleUpload("cover", e.target.files?.[0])}
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => coverInput.current?.click()}
              disabled={uploading !== null}
              className="text-xs font-semibold text-[#9d7837] hover:text-[#7f602d] disabled:opacity-50"
            >
              {uploading === "cover" ? "Subiendo..." : "Cambiar portada"}
            </button>
            {coverUrl && (
              <button
                onClick={() => handleRemove("cover")}
                disabled={uploading !== null}
                className="text-xs font-medium text-neutral-400 hover:text-red-600 disabled:opacity-50"
              >
                Quitar
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

type GalleryImage = { id: string; storage_path: string; url: string };

export function GalleryUploader({
  tenant,
  tenantId,
  images,
}: {
  tenant: string;
  tenantId: string;
  images: GalleryImage[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);

    const supabase = createClient();
    const path = `${tenantId}/gallery/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("barbershop-media")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("gallery_images")
      .insert({ tenant_id: tenantId, storage_path: path });

    setUploading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.refresh();
  }

  function handleDelete(id: string, storagePath: string) {
    startTransition(async () => {
      await deleteGalleryImage(tenant, id, storagePath);
      router.refresh();
    });
  }

  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">Galería</p>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files?.[0])}
        />
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="text-xs font-semibold text-[#9d7837] hover:text-[#7f602d] disabled:opacity-50"
        >
          {uploading ? "Subiendo..." : "+ Agregar imagen"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((img) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl bg-[#f7f6f2]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="h-full w-full object-cover" />
            <button
              onClick={() => handleDelete(img.id, img.storage_path)}
              disabled={pending}
              className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100"
            >
              Eliminar
            </button>
          </div>
        ))}
        {images.length === 0 && (
          <p className="col-span-full text-sm text-neutral-500">Aún no hay imágenes.</p>
        )}
      </div>
    </div>
  );
}
