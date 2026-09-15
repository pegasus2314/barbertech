"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./actions";
import { BUTTON_GHOST, BUTTON_PRIMARY, BUTTON_SECONDARY, CARD, INPUT } from "@/lib/ui";

export function ClientForm({ tenant }: { tenant: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={BUTTON_SECONDARY}>
        + Nuevo cliente
      </button>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !phone.trim()) {
      setError("Completa nombre y teléfono.");
      return;
    }

    startTransition(async () => {
      const result = await createClient(tenant, { fullName, phone, email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFullName("");
      setPhone("");
      setEmail("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${CARD} p-4`}>
      <div className="flex flex-wrap gap-3">
        <input
          autoFocus
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nombre completo"
          className={`min-w-[10rem] flex-1 ${INPUT}`}
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono"
          className={`w-40 ${INPUT}`}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo (opcional)"
          className={`w-48 ${INPUT}`}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
          {pending ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={BUTTON_GHOST}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
