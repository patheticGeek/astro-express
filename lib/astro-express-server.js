import { NodeApp, applyPolyfills } from "astro/app/node";
import express from "express";
import { fileURLToPath } from "url";
import { responseIterator } from "./response-iterator";

applyPolyfills();

/**
 * @param {NodeApp} app
 * @param {import('http').ServerResponse} res
 * @param {Response} webResponse
 */
async function writeWebResponse(app, res, webResponse) {
  const { status, headers, body } = webResponse;
  // Support the Astro.cookies API.
  if (app.setCookieHeaders) {
    const setCookieHeaders = Array.from(app.setCookieHeaders(webResponse));
    if (setCookieHeaders.length) {
      res.setHeader("Set-Cookie", setCookieHeaders);
    }
  }
  const headersObj = Object.fromEntries(headers.entries());
  res.writeHead(status, headersObj);
  if (body) {
    for await (const chunk of /** @type {any} */ responseIterator(body)) {
      res.write(chunk);
    }
  }
  res.end();
}

/**
 * @typedef {import('./types').ServerArgs} ServerArgs
 * @typedef {import('./types').DefineExpressRoutes} DefineExpressRoutes
 */

/**
 *
 * @param {import('astro').SSRManifest} manifest
 * @param {ServerArgs} options
 */
export async function start(manifest, options) {
  const app = new NodeApp(manifest);

  const server = express();

  const clientRoot = new URL(options.clientRelative, import.meta.url);
  const clientAssetsRoot = new URL(
    `.${options.assetsPrefix}`,
    `${clientRoot}/`
  );

  // magic variable inserted at build time
  if (typeof _setupRoutes !== "undefined") {
    await _setupRoutes(server);
  } else {
    console.error("_setupRoutes is undefined");
  }

  server.use(
    options.assetsPrefix,
    (req, res, next) => {
      res.setHeader("Cache-Control", "max-age=31536000,immutable");
      next();
    },
    express.static(fileURLToPath(clientAssetsRoot))
  );
  server.use(express.static(fileURLToPath(clientRoot)));

  server.all("/*", async (req, res) => {
    const response = await app.render(req, { locals: req.locals || {} });
    await writeWebResponse(app, res, response);
  });

  const port = Number(options.port ?? (process.env.PORT || 80));
  const host = options.host ?? (process.env.HOST || "0.0.0.0");

  server.listen(port, host, (...args) =>
    console.log(`Listening on ${host}:${port}`, ...args)
  );
}

export function createExports(manifest, options) {
  return {
    start() {
      return start(manifest, options);
    },
  };
}
