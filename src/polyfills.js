import { Buffer } from "buffer";

window.Buffer = window.Buffer || Buffer;
window.global = window.global || window;
window.process = window.process || {
  env: { NODE_DEBUG: undefined },
  browser: true,
  version: "",
  versions: { node: "" },
  nextTick: (fn, ...args) => Promise.resolve().then(() => fn(...args)),
  cwd: () => "/",
  platform: "browser",
};
