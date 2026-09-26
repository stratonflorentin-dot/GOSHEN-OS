"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function ServiceWorkerRegistration() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              window.dispatchEvent(new Event("goshen-sw-update"));
            }
          });
        });
      }).catch((error) => console.error("Service worker registration failed:", error));

      navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload());
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone);
    setIsIos(ios);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } else if (isIos) {
      setShowIosHelp(true);
    }
  }

  return (
    <>
      {(installPrompt || isIos) && (
        <button
          type="button"
          onClick={install}
          className="fixed bottom-4 left-4 z-[1000] inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          aria-label="Install GOSHEN OS on this device"
        >
          <Download size={17} aria-hidden="true" />
          Install app
        </button>
      )}
      {showIosHelp && (
        <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="presentation" onClick={() => setShowIosHelp(false)}>
          <section className="w-full max-w-sm rounded-2xl bg-white p-5 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100" role="dialog" aria-modal="true" aria-labelledby="install-help-title" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="install-help-title" className="text-lg font-semibold">Install GOSHEN OS</h2>
                <p className="mt-2 text-sm leading-6">In Safari, tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong>.</p>
              </div>
              <button type="button" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close" onClick={() => setShowIosHelp(false)}><X size={20} /></button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
