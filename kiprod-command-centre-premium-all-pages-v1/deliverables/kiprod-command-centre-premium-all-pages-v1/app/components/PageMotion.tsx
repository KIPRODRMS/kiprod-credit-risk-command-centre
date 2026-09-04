"use client";

import { usePathname } from "next/navigation";

export default function PageMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const routeClass = pathname === "/"
    ? "route-home"
    : `route-${pathname.replace(/^\//, "").replace(/[^a-z0-9-]/gi, "-") || "home"}`;

  return (
    <div key={pathname} className={`motion-page ${routeClass}`}>
      {children}
    </div>
  );
}
