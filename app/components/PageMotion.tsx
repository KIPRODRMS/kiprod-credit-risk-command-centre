"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PageMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const routeClass = pathname === "/"
    ? "route-home"
    : `route-${pathname.replace(/^\//, "").replace(/[^a-z0-9-]/gi, "-") || "home"}`;

  useEffect(() => {
    const root = document.querySelector(".motion-page");
    if (!root) return;

    const revealTargets = Array.from(
      root.querySelectorAll<HTMLElement>("main > *, main section, main article, main table, main [class*='rounded-2xl'], main [class*='rounded-3xl']")
    );
    revealTargets.forEach((element, index) => {
      element.classList.add("scroll-reveal");
      element.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 45}ms`);
    });

    const revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      }),
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
    );
    revealTargets.forEach((element) => revealObserver.observe(element));

    const numberPattern = /^(.*?)(-?\d[\d,]*(?:\.\d+)?)(.*)$/;
    const numberTargets = Array.from(
      root.querySelectorAll<HTMLElement>("main [data-count], main h2, main h3, main strong, main b")
    ).filter((element) => numberPattern.test((element.textContent || "").trim()) && element.children.length === 0);

    const numberObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        const original = (element.textContent || "").trim();
        const match = original.match(numberPattern);
        if (!match || element.dataset.counted === "true") return;
        element.dataset.counted = "true";
        const target = Number(match[2].replace(/,/g, ""));
        if (!Number.isFinite(target) || Math.abs(target) > 1_000_000_000) return;
        const decimals = (match[2].split(".")[1] || "").length;
        const duration = 900;
        const start = performance.now();
        const render = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = target * eased;
          element.textContent = `${match[1]}${current.toLocaleString("en-KE", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })}${match[3]}`;
          if (progress < 1) requestAnimationFrame(render);
          else element.textContent = original;
        };
        requestAnimationFrame(render);
        numberObserver.unobserve(element);
      });
    }, { threshold: 0.5 });
    numberTargets.forEach((element) => numberObserver.observe(element));

    const bars = Array.from(root.querySelectorAll<HTMLElement>("main [role='progressbar'], main [class*='progress'], main [class*='bar']"));
    bars.forEach((bar) => bar.classList.add("motion-build-bar"));
    const barObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-built");
        barObserver.unobserve(entry.target);
      }
    }), { threshold: 0.2 });
    bars.forEach((bar) => barObserver.observe(bar));

    return () => {
      revealObserver.disconnect();
      numberObserver.disconnect();
      barObserver.disconnect();
    };
  }, [pathname]);

  return (
    <div key={pathname} className={`motion-page ${routeClass}`}>
      {children}
    </div>
  );
}
