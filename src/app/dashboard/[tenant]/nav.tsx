"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "", label: "Resumen" },
  { href: "/citas", label: "Citas" },
  { href: "/clientes", label: "Clientes" },
  { href: "/servicios", label: "Servicios" },
  { href: "/barberos", label: "Barberos" },
  { href: "/horarios", label: "Horarios" },
  { href: "/finanzas", label: "Finanzas" },
  { href: "/estadisticas", label: "Estadísticas" },
  { href: "/configuracion", label: "Configuración" },
] as const;

export function DashboardNav({ tenant }: { tenant: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${tenant}`;

  return (
    <nav className="flex gap-1 overflow-x-auto px-4 pb-3 sm:flex-1 sm:flex-col sm:gap-0.5 sm:px-3 sm:py-6">
      {LINKS.map((link) => {
        const href = `${base}${link.href}`;
        const active = pathname === href;
        return (
          <Link
            key={link.href}
            href={href}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition sm:text-[13.5px] ${
              active
                ? "bg-[#c7a15a] text-[#171717] font-semibold sm:bg-white/10 sm:text-white"
                : "text-neutral-600 hover:bg-neutral-100 sm:text-white/55 sm:hover:bg-white/5 sm:hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
