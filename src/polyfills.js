import { Buffer } from "buffer";

window.Buffer = window.Buffer || Buffer;
window.global = window.global || window;
window.process = window.process || { env: {}, browser: true };
