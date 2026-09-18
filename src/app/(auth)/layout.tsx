// Flujo de autenticación — desarrollado por Albert Silvestre
import Link from "next/link";
import { SupportBubble } from "@/components/support-bubble";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f6f2] px-4 py-12">
      <SupportBubble />
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-[#171717] hover:opacity-70"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#171717] text-xs font-black text-[#f5d89a]">
              B
            </span>
            BarberTech
          </Link>
        </div>
        <div className="rounded-2xl border border-[#e7e3da] bg-white p-7 shadow-[0_8px_30px_rgba(23,23,23,0.04)]">
          {children}
        </div>
      </div>
    </div>
  );
}
