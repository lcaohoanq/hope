"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __hopeErudaReady?: boolean;
  }
}

const isEnabled = process.env.NEXT_PUBLIC_ENABLE_ERUDA === "true";

export function ErudaInspector() {
  useEffect(() => {
    if (!isEnabled || window.__hopeErudaReady) {
      return;
    }

    let isMounted = true;

    void import("eruda").then(({ default: eruda }) => {
      if (!isMounted || window.__hopeErudaReady) {
        return;
      }

      eruda.init({
        defaults: {
          displaySize: 50,
          transparency: 0.95,
        },
      });
      eruda.show("network");
      window.__hopeErudaReady = true;
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}
