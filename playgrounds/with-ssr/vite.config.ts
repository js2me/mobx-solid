import { defineConfig, type Plugin } from "vite";
import solidPlugin from "vite-plugin-solid";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

function solidSsrDevPlugin(): Plugin {
  return {
    name: "mobx-solid-ssr-dev",
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          try {
            const url = req.originalUrl ?? "/";

            let template = readFileSync(resolve(root, "index.html"), "utf-8");
            template = await server.transformIndexHtml(url, template);

            const { render } = await server.ssrLoadModule("/src/entry-server.tsx");
            const { html, hydrationScript } = await render();

            const page = template
              .replace("<!--app-head-->", hydrationScript)
              .replace("<!--app-html-->", html);

            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html");
            res.end(page);
          } catch (error) {
            server.ssrFixStacktrace(error as Error);
            next(error);
          }
        });
      };
    },
  };
}

export default defineConfig({
  root,
  plugins: [solidPlugin({ ssr: true }), solidSsrDevPlugin()],
  resolve: {
    alias: {
      "mobx-solid": resolve(root, "../../src/index.ts"),
    },
  },
  server: {
    port: 5175,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
