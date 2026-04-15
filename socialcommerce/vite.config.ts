/// <reference types="node" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";

const isVitest = !!process.env.VITEST;

export default defineConfig({
    plugins: [react(), ...(isVitest ? [] : [mkcert()])],
    // Dev server config — intentionally omitted in test mode so Vitest UI
    // never picks up https:true and never tries to create a secure server.
    ...(!isVitest && {
        server: {
            host: "localhost",
            port: 5173,
            strictPort: true,
            hmr: { protocol: "wss", host: "localhost", port: 5173 },
        },
    }),
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/test/setup.ts"],
        include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
        api: {
            host: "127.0.0.1",
            port: 5174,
        },
    },
});
