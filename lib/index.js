import express from "express";
import { relative } from "path";
import { fileURLToPath } from "url";

const isWindows = process.platform === "win32";
const serverFile = fileURLToPath(
  new URL("./astro-express-server.js", import.meta.url)
);

// @ts-ignore
const serverPath = isWindows ? serverFile.replaceAll("\\", "//") : serverFile;

/**
 * @typedef {import('astro').AstroUserConfig} AstroUserConfig
 * @typedef {import('astro').AstroConfig} AstroConfig
 * @typedef {import('vite').Plugin} VitePlugin
 * @typedef {import('./types').IntegrationOptions} IntegrationOptions
 * @typedef {import('./types').ServerArgs} ServerArgs
 */

/**
 * @param {string | URL} entry
 */
function entryToPath(entry) {
  if (typeof entry !== "string") {
    return fileURLToPath(entry);
  }
  return entry;
}

/**
 * @param {IntegrationOptions} [options]
 * @returns {VitePlugin}
 */
function vitePlugin(options) {
  return {
    name: "astro-express:vite",
    transform(code, id) {
      if (options?.entry && id.includes("astro-express-server.js")) {
        const entry = entryToPath(options.entry);
        const outCode = `import _setupRoutes from "${entry}";\n${code}`;
        return outCode;
      }
    },
  };
}

/**
 * @param {IntegrationOptions} options
 * @returns {import('astro').AstroIntegration}
 */
export default function integration(options) {
  const args = /** @type {ServerArgs} */ ({});
  args.port = options.port;
  args.host = options.host;
  /** @type {AstroConfig | undefined} */
  let config;
  /** @type {import('vite').ViteDevServer} */
  let astroServer;
  let expressServer;

  const nextSymbol = Symbol.for("astro-express.next");
  const localsSymbol = Symbol.for("astro.locals");

  return {
    name: "astro-express",
    hooks: {
      // put our middleware very first so we capture all requests
      "astro:server:setup": async function ({ server }) {
        expressServer = express();

        server.middlewares.use((req, res, next) => {
          req[nextSymbol] = next;
          expressServer(req, res);
        });

        astroServer = server;
      },
      // we do `ssrLoadModule` after server has started as vite dev server has
      // some issues resolving imports before it has fully started
      "astro:server:start": async function ({ logger }) {
        if (options?.entry) {
          const entry = entryToPath(options.entry);

          const entryModule = await astroServer.ssrLoadModule(entry);

          const setupRoutes = entryModule?.default || entryModule;
          if (typeof setupRoutes !== "function") {
            throw new Error(
              `astro-express: ${entry} should export a default function.`
            );
          }

          await setupRoutes(expressServer);
        } else {
          logger.error("Set the `entry` file for your server routes");
        }

        // Final catch-all route forwards back to the Vite server
        expressServer.all("/*", function (req) {
          Reflect.set(req, localsSymbol, req.locals || {});

          /** @type {import('connect').NextFunction} */
          const next = req[nextSymbol];
          next();
        });

        logger.info("Express routes setup");
      },
      "astro:config:setup": function ({ updateConfig }) {
        /** @type {import('astro/dist/type-utils').DeepPartial<AstroConfig>} */
        const config2 = {
          build: { assets: "assets" },
          vite: { plugins: [vitePlugin(options)] },
        };
        updateConfig(config2);
      },
      "astro:config:done": function ({ config: _config, setAdapter }) {
        config = _config;
        setAdapter({
          name: "astro-express:adapter",
          serverEntrypoint: serverPath,
          exports: ["start"],
          args,
          supportedAstroFeatures: {
            serverOutput: "stable",
            assets: {
              supportKind: "stable",
              isSharpCompatible: true,
              isSquooshCompatible: true,
            },
            i18nDomains: "experimental",
          },
        });
      },
      "astro:build:setup": function ({ vite, target }) {
        args.assetsPrefix = "/assets/";
        if (target === "client") {
          const outputOptions = vite?.build?.rollupOptions?.output;
          if (outputOptions && !Array.isArray(outputOptions)) {
            Object.assign(outputOptions, {
              entryFileNames: "assets/[name].[hash].js",
              chunkFileNames: "assets/chunks/[name].[hash].js",
            });
          }
        }
      },
      "astro:build:start": function (...buildStartArgs) {
        /** @type {import('astro').AstroConfig['build'] | undefined} */
        let bc;
        if (
          buildStartArgs.length > 0 &&
          /** @type {any} */ (buildStartArgs)[0].buildConfig
        ) {
          bc = /** @type {any} */ (buildStartArgs)[0].buildConfig;
        } else {
          bc = config?.build;
        }
        if (bc) {
          args.clientRelative = relative(
            fileURLToPath(bc.server),
            fileURLToPath(bc.client)
          );
        }
      },
    },
  };
}
