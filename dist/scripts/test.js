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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const secrets_1 = require("./common/secrets");
const ts_command_line_args_1 = require("ts-command-line-args");
const blockchain_addressbook_1 = require("blockchain-addressbook");
const fast_glob_1 = __importDefault(require("fast-glob"));
const node_path_1 = require("node:path");
const utils_1 = require("./common/utils");
const child_process_1 = require("child_process");
const lodash_1 = require("lodash");
const safe_1 = __importDefault(require("colors/safe"));
const OK = safe_1.default.green('✓');
const FAIL = safe_1.default.red('✗');
const WARN = safe_1.default.yellow('⚠');
const BULLET = safe_1.default.blue('•');
const LINE = safe_1.default.gray('-'.repeat(80));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const cliArgs = (0, ts_command_line_args_1.parse)({
            function: { type: String, alias: 'f' },
            debug: { type: Boolean, alias: 'd', optional: true },
            showLogs: { type: Boolean, alias: 'l', optional: true },
            runtime: { type: String, optional: true, defaultValue: 'thread' },
            chainId: { type: Number, alias: 'c', optional: true },
            rpc: { type: String, alias: 'r', optional: true },
            userArgs: { type: String, alias: 'a', multiple: true, optional: true },
            userFile: { type: String, alias: 'u', optional: true, defaultValue: 'user-args.json' },
        });
        let debug = cliArgs.debug || false;
        let showLogs = cliArgs.showLogs || false;
        let chainId;
        let runtime = 'thread';
        let rpc;
        let functionPath;
        let userArgs = {};
        // Function
        if (cliArgs.function) {
            const availableFunctions = yield getAvailableFunctions();
            if (cliArgs.function in availableFunctions) {
                functionPath = availableFunctions[cliArgs.function];
            }
            else {
                throw new Error(`Invalid function: ${cliArgs.function}`);
            }
        }
        else {
            throw new Error('Missing function in CLI arguments');
        }
        // Chain id
        if (cliArgs.chainId) {
            if (String(cliArgs.chainId) in blockchain_addressbook_1.addressBookByChainId) {
                chainId = cliArgs.chainId;
            }
            else {
                throw new Error(`Invalid chainId: ${cliArgs.chainId}`);
            }
        }
        else if (process.env.CHAIN_ID) {
            chainId = parseInt(process.env.CHAIN_ID);
            if (!(String(chainId) in blockchain_addressbook_1.addressBookByChainId)) {
                throw new Error(`Invalid chainId: ${process.env.CHAIN_ID}`);
            }
        }
        else {
            throw new Error('Missing CHAIN_ID in environment or chainId in CLI arguments');
        }
        // Runtime
        if (cliArgs.runtime) {
            if (cliArgs.runtime === 'docker' || cliArgs.runtime === 'thread') {
                runtime = cliArgs.runtime;
            }
            else {
                throw new Error(`Invalid runtime: ${cliArgs.runtime}`);
            }
        }
        // Rpc
        if (cliArgs.rpc) {
            rpc = cliArgs.rpc;
        }
        else if (process.env.PROVIDER_URL) {
            rpc = process.env.PROVIDER_URL;
        }
        else {
            throw new Error('Missing PROVIDER_URL in environment or rpc in CLI arguments');
        }
        // User args
        if (cliArgs.userArgs) {
            cliArgs.userArgs.forEach(arg => {
                const [key, value] = arg.split('=');
                if (key && value) {
                    userArgs[key] = value;
                }
            });
        }
        else {
            if (cliArgs.userFile && !(yield (0, utils_1.fileExists)(cliArgs.userFile))) {
                throw new Error(`User file not found: ${cliArgs.userFile}`);
            }
            const possibleFiles = cliArgs.userFile
                ? [cliArgs.userFile]
                : [(0, node_path_1.join)((0, node_path_1.dirname)(functionPath), 'user-args.json'), (0, node_path_1.join)(process.cwd(), 'user-args.json')];
            for (const file of possibleFiles) {
                if (yield (0, utils_1.fileExists)(file)) {
                    const data = yield (0, utils_1.loadJson)(file);
                    if (typeof data === 'object' && data !== null) {
                        Object.assign(userArgs, data);
                        break;
                    }
                }
            }
        }
        // User args validation/conversion for passing on CLI
        const cliUserArgs = (0, lodash_1.mapValues)(userArgs, (value, key) => {
            if (value === null) {
                throw new Error(`Invalid user arg: ${key}=${value}`);
            }
            if (typeof value === 'string') {
                return value;
            }
            if (typeof value === 'number') {
                return value.toString();
            }
            if (typeof value === 'boolean') {
                return value ? 'true' : 'false';
            }
            if (Array.isArray(value)) {
                return JSON.stringify(value);
            }
            throw new Error(`Invalid user arg: ${key}=${value}`);
        });
        const secrets = (0, secrets_1.getSecretsFromEnv)();
        const options = {
            functionPath,
            debug,
            showLogs,
            runtime,
            chainId,
            rpc,
            userArgs: cliUserArgs,
            secrets,
        };
        yield runTest(options);
    });
}
function getAvailableFunctions() {
    return __awaiter(this, void 0, void 0, function* () {
        const files = yield (0, fast_glob_1.default)('src/web3-functions/*/index.ts');
        return Object.fromEntries(files.map(file => [file.split('/')[2], file]));
    });
}
function printOptions(options) {
    const { functionPath, debug, showLogs, runtime, chainId, rpc, userArgs, secrets } = options;
    console.log(LINE);
    console.log(`Testing ${functionPath}...`);
    console.log(`  ${OK} debug: ${debug ? 'true' : 'false'}`);
    console.log(`  ${OK} showLogs: ${showLogs ? 'true' : 'false'}`);
    console.log(`  ${OK} runtime: ${runtime}`);
    console.log(`  ${OK} chainId: ${chainId}`);
    console.log(`  ${OK} rpc: ${rpc}`);
    const userArgsEntries = Object.entries(userArgs);
    console.log(`  ${userArgsEntries.length ? OK : WARN} userArgs:`);
    if (userArgsEntries.length > 0) {
        for (const [key, value] of userArgsEntries) {
            console.log(`    ${BULLET} ${key}: ${value}`);
        }
    }
    else {
        console.log('    (empty)');
    }
    const secretsEntries = Object.entries(secrets);
    console.log(`  ${secretsEntries.length ? OK : WARN} secrets:`);
    if (secretsEntries.length > 0) {
        for (const [key, value] of secretsEntries) {
            console.log(`    ${BULLET} ${key}: ${value}`);
        }
    }
    else {
        console.log('    (empty)');
    }
    console.log(LINE);
    console.log('');
}
function runTest(options) {
    return __awaiter(this, void 0, void 0, function* () {
        printOptions(options);
        // env already contains secrets
        const env = Object.assign(Object.assign({}, process.env), { PROVIDER_URL: options.rpc, CHAIN_ID: options.chainId.toString() });
        // "npx w3f test src/web3-functions/beefy-swapper/index.ts --show-logs",
        const args = ['w3f', 'test', options.functionPath];
        if (options.debug) {
            args.push('--debug');
        }
        if (options.showLogs) {
            args.push('--show-logs');
        }
        if (options.runtime) {
            args.push(`--runtime=${options.runtime}`);
        }
        if (options.chainId) {
            args.push(`--chain-id=${options.chainId}`);
        }
        const userArgsEntries = Object.entries(options.userArgs);
        if (userArgsEntries.length > 0) {
            for (const [key, value] of userArgsEntries) {
                args.push(`--user-args=${key}:${value}`);
            }
        }
        const spawned = (0, child_process_1.spawn)('npx', args, { env, shell: true });
        spawned.stdout.pipe(process.stdout);
        spawned.stderr.pipe(process.stderr);
        yield new Promise(resolve => spawned.on('exit', resolve));
    });
}
main()
    .then(() => {
    process.exit();
})
    .catch(e => {
    console.error(e);
    process.exit(1);
});
