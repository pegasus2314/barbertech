"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIOS() {
  return typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true)
  );
}

export function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [ios] = useState(isIOS);

  useEffect(() => {
    function handlePrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function handleInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (installed) {
    return (
      <div className="rounded-2xl border border-[#e7e3da] bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">App</p>
        <p className="mt-3 text-sm text-emerald-700">✓ Ya tienes BarberTech instalado en este dispositivo.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#e7e3da] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d7837]">App</p>
      <h3 className="mt-1 text-base font-bold text-neutral-950">Instalar como aplicación</h3>
      <p className="mt-2 text-sm text-neutral-500">
        Agrega BarberTech a la pantalla de inicio de tu teléfono o computadora. Abre en pantalla completa,
        con su propio ícono, sin la barra del navegador.
      </p>

      {deferredPrompt ? (
        <button
          onClick={async () => {
            await deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            if (choice.outcome === "accepted") setInstalled(true);
            setDeferredPrompt(null);
          }}
          className="mt-4 rounded-xl bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Instalar app
        </button>
      ) : ios ? (
        <p className="mt-4 rounded-xl bg-[#f7f6f2] p-3.5 text-sm text-neutral-600">
          En iPhone: toca <strong>Compartir</strong> (el ícono con la flecha hacia arriba) en Safari y luego{" "}
          <strong>&quot;Agregar a pantalla de inicio&quot;</strong>.
        </p>
      ) : (
        <p className="mt-4 text-sm text-neutral-500">
          Busca la opción <strong>&quot;Instalar app&quot;</strong> o <strong>&quot;Agregar a pantalla de inicio&quot;</strong> en el
          menú de tu navegador.
        </p>
      )}
    </div>
  );
}
