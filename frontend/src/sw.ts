import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Audio assets - cache first (immutable)
    {
      matcher: /\/audio\/.+\.(mp3|wav|ogg|webm)$/i,
      handler: new CacheFirst({
        cacheName: "audio-cache",
        plugins: [],
        matchOptions: { ignoreVary: true },
      }),
    },
    // Character / UI images - cache first
    {
      matcher: /\/images\/.+\.(png|jpg|jpeg|webp|svg)$/i,
      handler: new CacheFirst({
        cacheName: "image-cache",
        plugins: [],
        matchOptions: { ignoreVary: true },
      }),
    },
    // Curriculum API - stale while revalidate
    {
      matcher: /\/api\/v1\/curriculum\//,
      handler: new StaleWhileRevalidate({
        cacheName: "curriculum-cache",
        plugins: [],
      }),
    },
    // Learning progress API - network first
    {
      matcher: /\/api\/v1\/progress\//,
      handler: new NetworkFirst({
        cacheName: "progress-cache",
        plugins: [],
        networkTimeoutSeconds: 5,
      }),
    },
    // Game state API - network first
    {
      matcher: /\/api\/v1\/game\//,
      handler: new NetworkFirst({
        cacheName: "game-cache",
        plugins: [],
        networkTimeoutSeconds: 5,
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
