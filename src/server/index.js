import { defaultLocals } from "./utils";

/**
 * @type {import('../../lib/types').DefineExpressRoutes}
 */
export default (server) => {
  server.get("/ping", (req, res) => {
    res.send("This is served to you by expresss!!");
  });

  server.get("/mixed", (req, res, next) => {
    req.locals = defaultLocals;
    next();
  });

  server.get("/luck", (req, res, next) => {
    if (Math.random() > 0.5) {
      return res.send("not lucky, try again");
    }

    req.locals = { msg: "you're lucky" };
    next();
  });
};
