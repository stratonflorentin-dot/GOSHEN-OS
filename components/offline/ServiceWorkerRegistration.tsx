"use client";

import { useEffect, useState } from "react";

export default function ServiceWorkerRegistration() {
  const [swSupported, setSwSupported] = useState(false);
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check if service workers are supported
    if ("serviceWorker" in navigator) {
      setSwSupported(true);

      // Register service worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);

          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  setSwUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });

      // Listen for controlling service worker changes
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    }
  }, []);

  const handleUpdate = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" });
    }
  };

  if (!swSupported) return null;

  return (
    <>
      {swUpdateAvailable && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-primary text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <span className="text-sm">Update available</span>
            <button
              onClick={handleUpdate}
              className="bg-white text-primary px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
            >
              Update
            </button>
          </div>
        </div>
      )}
    </>
  );
}