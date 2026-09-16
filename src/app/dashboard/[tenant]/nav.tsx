"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconCalendar,
  IconUsers,
  IconScissors,
  IconBarber,
  IconClock,
  IconDollar,
  IconChart,
  IconSettings,
} from "@/lib/icons";

const LINKS = [
  { href: "", label: "Resumen", Icon: IconHome },
  { href: "/citas", label: "Citas", Icon: IconCalendar },
  { href: "/clientes", label: "Clientes", Icon: IconUsers },
  { href: "/servicios", label: "Servicios", Icon: IconScissors },
  { href: "/barberos", label: "Barberos", Icon: IconBarber },
  { href: "/horarios", label: "Horarios", Icon: IconClock },
  { href: "/finanzas", label: "Finanzas", Icon: IconDollar },
  { href: "/estadisticas", label: "Estadísticas", Icon: IconChart },
  { href: "/configuracion", label: "Configuración", Icon: IconSettings },
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
            className={`group relative flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition sm:text-[13.5px] ${
              active
                ? "bg-[#c7a15a] text-[#171717] font-semibold sm:bg-white/[0.08] sm:text-white"
                : "text-neutral-600 hover:bg-neutral-100 sm:text-white/50 sm:hover:bg-white/5 sm:hover:text-white"
            }`}
          >
            <span
              className={`hidden sm:absolute sm:inset-y-1.5 sm:left-0 sm:block sm:w-[3px] sm:rounded-full sm:transition ${
                active ? "bg-[#c7a15a]" : "bg-transparent"
              }`}
            />
            <link.Icon className={active ? "" : "opacity-70 group-hover:opacity-100"} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
