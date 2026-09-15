"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "./actions";
import { BUTTON_PRIMARY, CARD, INPUT } from "@/lib/ui";

export function ProfileForm({
  tenant,
  initial,
}: {
  tenant: string;
  initial: { name: string; description: string; phone: string; whatsapp: string; address: string };
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [phone, setPhone] = useState(initial.phone);
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp);
  const [address, setAddress] = useState(initial.address);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateProfile(tenant, { name, description, phone, whatsapp, address });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${CARD} p-5`}>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Nombre</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 w-full ${INPUT}`} />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={`mt-1 w-full ${INPUT}`}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-500">Teléfono</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`mt-1 w-full ${INPUT}`} />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-500">WhatsApp</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="18091234567"
            className={`mt-1 w-full ${INPUT}`}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Dirección</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} className={`mt-1 w-full ${INPUT}`} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
        {saved && <span className="text-sm font-medium text-emerald-700">Guardado</span>}
      </div>
    </form>
  );
}
