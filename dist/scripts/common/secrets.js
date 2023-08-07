"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecretsFromEnv = exports.setSecretsFromEnv = void 0;
function setSecretsFromEnv(web3Function) {
    return __awaiter(this, void 0, void 0, function* () {
        // Fill up secrets with `SECRETS_*` env
        console.log('Setting secrets...');
        const secrets = getSecretsFromEnv();
        yield web3Function.secrets.set(secrets);
        // Get updated list of secrets
        const secretsList = yield web3Function.secrets.list();
        console.log(`Updated secrets list: `);
        console.dir(secretsList);
    });
}
exports.setSecretsFromEnv = setSecretsFromEnv;
function getSecretsFromEnv() {
    return Object.fromEntries(Object.entries(process.env)
        .filter(([key, value]) => key.startsWith('SECRETS_') && !!value)
        .map(([key, value]) => [key.replace('SECRETS_', ''), value]));
}
exports.getSecretsFromEnv = getSecretsFromEnv;
