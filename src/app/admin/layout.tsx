// Panel de Super Admin — desarrollado por Albert Silvestre
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { AdminNav } from "./admin-nav";
import { SupportBubble } from "@/components/support-bubble";

export const metadata = { title: "Super Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <SupportBubble context="Super Admin" />
      <header className="border-b border-[#e7e3da] bg-[#171717] text-white">
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-8">
          <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c7a15a] text-xs font-black text-[#171717]">
              B
            </span>
            BarberTech <span className="text-white/40">· Super Admin</span>
          </Link>
          <SignOutButton variant="dark" />
        </div>
        <AdminNav />
      </header>
      <main className="px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
