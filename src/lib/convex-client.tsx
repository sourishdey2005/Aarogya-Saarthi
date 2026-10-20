"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

/** Vite injects `import.meta.env`; a plain Node/SSR context does not. */
const env: Record<string, string | undefined> =
 (typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string> }).env) || {};

const convex = new ConvexReactClient(env.VITE_CONVEX_URL || "");

export function ConvexProviderWrapper({ children }: { children: ReactNode }) {
 return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

export { convex };