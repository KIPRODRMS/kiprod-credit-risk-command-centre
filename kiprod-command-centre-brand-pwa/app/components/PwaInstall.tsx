"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PwaInstall() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean(
        (window.navigator as Navigator & { standalone?: boolean }).standalone,
      );
    const revealInstallOption = window.setTimeout(() => {
      setIsStandalone(standalone);
      setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
    }, 0);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // The app remains fully usable if service-worker registration is blocked.
      });
    }

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const markInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.clearTimeout(revealInstallOption);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  if (isStandalone || (!installPrompt && !isIos)) return null;

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallPrompt(null);
      return;
    }
    setShowIosHelp(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={install}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-cyan-300/40 bg-[#0b2035] px-5 py-3 text-sm font-extrabold text-white shadow-2xl shadow-slate-950/30 transition hover:-translate-y-0.5 hover:bg-[#10304c] focus:outline-none focus:ring-4 focus:ring-cyan-300/30"
        aria-label="Install KIPROD Command Centre"
      >
        <span aria-hidden="true">↓</span>
        Install Command Centre
      </button>

      {showIosHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
            <div className="mb-4 flex items-start gap-4">
              <Image
                src="/icon-192.png"
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 rounded-2xl"
              />
              <div>
                <h2 id="ios-install-title" className="text-lg font-black">
                  Install on iPhone or iPad
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Open this page in Safari, tap the Share button, then choose
                  “Add to Home Screen”.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              className="w-full rounded-xl bg-[#071426] px-4 py-3 font-bold text-white hover:bg-[#10304c]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
