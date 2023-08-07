"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installConsoleSanitizer = void 0;
const ConsoleSanitizer_1 = require("./ConsoleSanitizer");
function installConsoleSanitizer(secrets) {
    globalThis.console = new Proxy(globalThis.console, new ConsoleSanitizer_1.ConsoleSanitizer(secrets));
}
exports.installConsoleSanitizer = installConsoleSanitizer;
