"use client";

import { useEffect } from "react";
import { countUsage } from "@/components/usage";

// Once per page load: going from screen to screen (or back to the intro and in again) is not opening the app again.
let counted = false;

/** When the app opens, it is counted once (components/usage.ts). */
export function CountOpen() {
  useEffect(() => {
    if (counted) return;
    counted = true;
    countUsage("open");
  }, []);
  return null;
}
