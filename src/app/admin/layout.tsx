import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { SignOutButton } from "@/app/dashboard/sign-out-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 sm:px-8">
        <Link href="/admin" className="text-sm font-semibold text-neutral-900">
          BarberTech · Super Admin
        </Link>
        <SignOutButton />
      </header>
      <main className="px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
