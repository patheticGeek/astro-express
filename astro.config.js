import { defineConfig } from "astro/config";
import expressAdapter from "./lib";

export default defineConfig({
  output: "server",
  adapter: expressAdapter({
    entry: new URL("./src/server/index.js", import.meta.url),
  }),
  server: {
    port: 3000,
    host: "127.0.0.1",
  },
});
