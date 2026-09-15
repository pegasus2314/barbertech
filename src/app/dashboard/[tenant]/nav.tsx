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
  { href: "/configuracion", label: "Configuración" },
] as const;

export function DashboardNav({ tenant }: { tenant: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${tenant}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200 px-4 py-2 sm:flex-col sm:gap-0.5 sm:border-b-0 sm:px-3 sm:py-4">
      {LINKS.map((link) => {
        const href = `${base}${link.href}`;
        const active = pathname === href;
        return (
          <Link
            key={link.href}
            href={href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
