"use client";

import { usePathname } from "next/navigation";

export default function PageMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="motion-page">
      {children}
    </div>
  );
}
