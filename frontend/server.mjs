import { createServer } from "https";
import { readFileSync } from "fs";
import { parse } from "url";
import next from "next";
import httpProxy from "http-proxy";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = 3000;
const BACKEND = "http://127.0.0.1:8000";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: readFileSync(new URL("./certs/key.pem", import.meta.url)),
  cert: readFileSync(new URL("./certs/cert.pem", import.meta.url)),
};

const proxy = httpProxy.createProxyServer({ target: BACKEND, ws: true });
proxy.on("error", (err) => {
  console.error("Proxy error:", err.message);
});

app.prepare().then(() => {
  const server = createServer(httpsOptions, async (req, res) => {
    const parsedUrl = parse(req.url, true);
    // Proxy API requests to backend
    if (req.url?.startsWith("/api/v1/")) {
      proxy.web(req, res, { target: BACKEND });
    } else {
      await handle(req, res, parsedUrl);
    }
  });

  // Proxy WebSocket upgrade for /api/v1/* to backend
  server.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/api/v1/")) {
      proxy.ws(req, socket, head, { target: BACKEND });
    } else {
      // Let Next.js handle its own HMR websocket
      app.getUpgradeHandler()(req, socket, head);
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on https://${hostname}:${port}`);
  });
});
