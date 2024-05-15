# astro-express

Needed to host a astro website behind express js hence this package.

> This code is heavily inspired/some parts taken from https://github.com/matthewp/astro-fastify

This adapter -

- works in dev mode
- resolves imports correctly
- can pass down values from express (`req.locals`) to `Astro.locals`

## Install

```js
astro add astro-express
```

or manually:

```js
npm i astro-express
```

## Usage

Import it in `astro.config.mjs` file:

```js
import { defineConfig } from "astro/config";
import expressAdapter from "astro-express";

export default defineConfig({
  output: "server",
  adapter: expressAdapter({
    entry: new URL("./server/index.js", import.meta.url),
  }),
});
```

Then in [`./server/index.js`](./src/server/index.js) file export a function like follows:

```js
/** @type {import('astro-express').DefineExpressRoutes} */
export default (server) => {
  server.get("/ping", (req, res) => {
    res.send("This is served to you by expresss!!");
  });

  // req.locals are send down to astro and accessible on Astro.locals
  server.get("/mixed", (req, res, next) => {
    req.locals = { hello: "from express" };
    next(); // will render pages/mixed.astro
  });

  server.get("/luck", (req, res, next) => {
    if (Math.random() > 0.5) return res.send("not lucky, try again");

    req.locals = { msg: "you're lucky" };
    next();
  });
};
```

## Configuring

This respects the server port & host that is set as the express server runs on the astro dev server

```js
export default {
  output: "server",
  adapter: expressAdapter({
    entry: new URL("./server/index.js", import.meta.url),
  }),
  server: {
    port: 3000,
    host: "127.0.0.1",
  },
};
```

See below for how to configure for prod.

## Building

Build however you build your astro project

```sh
npm run astro build
# or
npm run build
```

And then startup the entrypoint

```sh
node dist/server/entry.mjs
```

You can also specify the host & port using env. vars.

```sh
HOST=0.0.0.0 PORT=6969 node dist/server/entry.mjs
```
