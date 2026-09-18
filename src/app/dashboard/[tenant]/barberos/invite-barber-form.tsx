"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteBarber } from "./actions";
import { BUTTON_GHOST, BUTTON_PRIMARY, BUTTON_SECONDARY, CARD, INPUT } from "@/lib/ui";

export function InviteBarberForm({
  tenant,
  services,
}: {
  tenant: string;
  services: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={BUTTON_SECONDARY}>
        + Invitar por correo
      </button>
    );
  }

  function toggleService(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError("Ingresa el nombre y el correo.");
      return;
    }

    startTransition(async () => {
      const result = await inviteBarber(tenant, { email, displayName: name, serviceIds: selected });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(email);
      setName("");
      setEmail("");
      setSelected([]);
      router.refresh();
    });
  }

  if (sent) {
    return (
      <div className={`${CARD} space-y-2 p-4`}>
        <p className="text-sm font-medium text-emerald-700">✓ Invitación enviada a {sent}</p>
        <p className="text-xs text-neutral-500">
          Cuando acepte, va a poder entrar al panel como barbero de esta barbería.
        </p>
        <button
          onClick={() => {
            setSent(null);
            setOpen(false);
          }}
          className={BUTTON_GHOST}
        >
          Listo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${CARD} p-4`}>
      <p className="text-xs text-neutral-500">
        Le llega un correo para crear su contraseña y entrar directo al panel, ya asignado a esta barbería.
      </p>
      <div className="flex flex-wrap gap-3">
        <input
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del barbero"
          className={`w-full max-w-xs ${INPUT}`}
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo"
          className={`w-full max-w-xs ${INPUT}`}
        />
      </div>

      {services.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-500">Servicios que realiza</p>
          <div className="flex flex-wrap gap-2">
            {services.map((service) => (
              <button
                type="button"
                key={service.id}
                onClick={() => toggleService(service.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  selected.includes(service.id)
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-[#e7e3da] text-neutral-600 hover:border-[#c7a15a]"
                }`}
              >
                {service.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
          {pending ? "Enviando..." : "Enviar invitación"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={BUTTON_GHOST}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
