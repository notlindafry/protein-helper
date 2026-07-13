"use client";

import { useEffect, useState } from "react";

// Chrome fires `beforeinstallprompt` (Android especially) when the app meets
// installability criteria. We stash the event and expose an explicit "Install"
// button so the primary Android audience can add it to their home screen; the
// same effect registers the service worker that installability depends on.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPwa() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline/install is best-effort; app works without it */
      });
    }

    // Already running as an installed app → nothing to prompt.
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari standalone flag
      (window.navigator as unknown as { standalone?: boolean }).standalone
    ) {
      setHidden(true);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setHidden(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || !deferred) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        const e = deferred;
        setDeferred(null);
        await e.prompt();
        await e.userChoice.catch(() => undefined);
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--accent-dim)] px-3.5 py-2 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]"
    >
      <span aria-hidden="true">↓</span>
      Install app
    </button>
  );
}
