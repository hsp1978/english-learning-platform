function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const hostname = window.location.hostname;
    const port = window.location.port || (proto === "wss:" ? "443" : "80");
    // Use same host:port as the page — custom server proxies /api/v1 WS to backend
    return `${proto}//${hostname}:${port}/api/v1`;
  }
  return "ws://localhost:8000/api/v1";
}

export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "/api/v1",
  get wsUrl() { return getWsUrl(); },
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "영어요정",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  enableAiTalk: process.env.NEXT_PUBLIC_ENABLE_AI_TALK === "true" || process.env.NEXT_PUBLIC_ENABLE_AI_TALK === "1",
  enableOffline: process.env.NEXT_PUBLIC_ENABLE_OFFLINE === "true" || process.env.NEXT_PUBLIC_ENABLE_OFFLINE === "1",
  enableSpeech: process.env.NEXT_PUBLIC_ENABLE_SPEECH === "true" || process.env.NEXT_PUBLIC_ENABLE_SPEECH === "1",
  gaId: process.env.NEXT_PUBLIC_GA_ID ?? "",
} as const;
