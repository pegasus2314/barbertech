"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconStore, IconDollar, IconActivity, IconInbox } from "@/lib/icons";

const TABS = [
  { href: "/admin", label: "Resumen", Icon: IconStore },
  { href: "/admin/pagos", label: "Pagos", Icon: IconDollar },
  { href: "/admin/soporte", label: "Soporte", Icon: IconInbox },
  { href: "/admin/actividad", label: "Actividad", Icon: IconActivity },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 px-4 sm:px-8">
      {TABS.map((tab) => {
        const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              active ? "border-[#c7a15a] text-white" : "border-transparent text-white/55 hover:text-white"
            }`}
          >
            <tab.Icon />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
