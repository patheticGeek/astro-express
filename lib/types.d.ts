import type { AstroIntegration } from "astro";
import type { Express } from "express";

export type ServerArgs = {
  clientRelative: string;
  assetsPrefix: string;
  host: string | undefined;
  port: number | undefined;
};

export type DefineExpressRoutes = (express: Express) => void;

export type IntegrationOptions = {
  /**
   * The entrypoint to where your express routes are defined
   */
  entry: string | URL;
  /**
   * By default 0.0.0.0 is used
   */
  host?: number;
  /**
   * By default process.env.PORT is used
   */
  port?: number;
};

export default function (opts: IntegrationOptions): AstroIntegration;
