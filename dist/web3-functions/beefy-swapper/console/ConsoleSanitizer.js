"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleSanitizer = void 0;
const utils_1 = require("../utils");
class ConsoleSanitizer {
    constructor(secrets) {
        this.secrets = secrets;
    }
    get(target, prop) {
        if (['log', 'debug', 'warn', 'error'].includes(prop)) {
            return (...args) => {
                target[prop](...this.format(...args));
            };
        }
        return target.error(`Sanitization of console.${prop} not implemented`);
    }
    format(...args) {
        return args.map(arg => (0, utils_1.sanitizeValue)(arg, this.secrets));
    }
}
exports.ConsoleSanitizer = ConsoleSanitizer;
