import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crea tu barbería",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
