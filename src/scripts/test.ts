import { getSecretsFromEnv } from './common/secrets';
import { parse } from 'ts-command-line-args';
import { addressBookByChainId } from 'blockchain-addressbook';
import { Web3FunctionUserArgs } from '@gelatonetwork/web3-functions-sdk/dist/lib/types/Web3FunctionUserArgs';
import fg from 'fast-glob';
import { dirname, join } from 'node:path';
import { fileExists, loadJson } from './common/utils';
import { spawn } from 'child_process';
import { mapValues } from 'lodash';
import safeColors from 'colors/safe';

type CliArgs = {
  function: string;
  debug?: boolean;
  showLogs?: boolean;
  runtime?: string;
  chainId?: number;
  rpc?: string;
  userArgs?: string[];
  userFile?: string;
};

type Options = {
  functionPath: string;
  debug: boolean;
  showLogs: boolean;
  runtime: 'docker' | 'thread';
  chainId: number;
  rpc: string;
  userArgs: Record<string, string>;
  secrets: Record<string, string>;
};

const OK = safeColors.green('✓');
const FAIL = safeColors.red('✗');
const WARN = safeColors.yellow('⚠');
const BULLET = safeColors.blue('•');
const LINE = safeColors.gray('-'.repeat(80));

async function main() {
  const cliArgs = parse<CliArgs>({
    function: { type: String, alias: 'f' },
    debug: { type: Boolean, alias: 'd', optional: true },
    showLogs: { type: Boolean, alias: 'l', optional: true },
    runtime: { type: String, optional: true, defaultValue: 'thread' },
    chainId: { type: Number, alias: 'c', optional: true },
    rpc: { type: String, alias: 'r', optional: true },
    userArgs: { type: String, alias: 'a', multiple: true, optional: true },
    userFile: { type: String, alias: 'u', optional: true, defaultValue: 'user-args.json' },
  });

  let debug: boolean = cliArgs.debug || false;
  let showLogs: boolean = cliArgs.showLogs || false;
  let chainId: number;
  let runtime: 'docker' | 'thread' = 'thread';
  let rpc: string;
  let functionPath: string;
  let userArgs: Web3FunctionUserArgs = {};

  // Function
  if (cliArgs.function) {
    const availableFunctions = await getAvailableFunctions();
    if (cliArgs.function in availableFunctions) {
      functionPath = availableFunctions[cliArgs.function];
    } else {
      throw new Error(`Invalid function: ${cliArgs.function}`);
    }
  } else {
    throw new Error('Missing function in CLI arguments');
  }

  // Chain id
  if (cliArgs.chainId) {
    if (String(cliArgs.chainId) in addressBookByChainId) {
      chainId = cliArgs.chainId;
    } else {
      throw new Error(`Invalid chainId: ${cliArgs.chainId}`);
    }
  } else if (process.env.CHAIN_ID) {
    chainId = parseInt(process.env.CHAIN_ID);
    if (!(String(chainId) in addressBookByChainId)) {
      throw new Error(`Invalid chainId: ${process.env.CHAIN_ID}`);
    }
  } else {
    throw new Error('Missing CHAIN_ID in environment or chainId in CLI arguments');
  }

  // Runtime
  if (cliArgs.runtime) {
    if (cliArgs.runtime === 'docker' || cliArgs.runtime === 'thread') {
      runtime = cliArgs.runtime;
    } else {
      throw new Error(`Invalid runtime: ${cliArgs.runtime}`);
    }
  }

  // Rpc
  if (cliArgs.rpc) {
    rpc = cliArgs.rpc;
  } else if (process.env.PROVIDER_URL) {
    rpc = process.env.PROVIDER_URL;
  } else {
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
  } else {
    if (cliArgs.userFile && !(await fileExists(cliArgs.userFile))) {
      throw new Error(`User file not found: ${cliArgs.userFile}`);
    }

    const possibleFiles = cliArgs.userFile
      ? [cliArgs.userFile]
      : [join(dirname(functionPath), 'user-args.json'), join(process.cwd(), 'user-args.json')];

    for (const file of possibleFiles) {
      if (await fileExists(file)) {
        const data = await loadJson(file);
        if (typeof data === 'object' && data !== null) {
          Object.assign(userArgs, data);
          break;
        }
      }
    }
  }

  // User args validation/conversion for passing on CLI
  const cliUserArgs: Record<string, string> = mapValues(userArgs, (value, key) => {
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

  const secrets = getSecretsFromEnv();

  const options: Options = {
    functionPath,
    debug,
    showLogs,
    runtime,
    chainId,
    rpc,
    userArgs: cliUserArgs,
    secrets,
  };

  await runTest(options);
}

async function getAvailableFunctions(): Promise<Record<string, string>> {
  const files = await fg('src/web3-functions/*/index.ts');
  return Object.fromEntries(files.map(file => [file.split('/')[2], file]));
}

function printOptions(options: Options) {
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
  } else {
    console.log('    (empty)');
  }

  const secretsEntries = Object.entries(secrets);
  console.log(`  ${secretsEntries.length ? OK : WARN} secrets:`);
  if (secretsEntries.length > 0) {
    for (const [key, value] of secretsEntries) {
      console.log(`    ${BULLET} ${key}: ${value}`);
    }
  } else {
    console.log('    (empty)');
  }
  console.log(LINE);
  console.log('');
}

async function runTest(options: Options) {
  printOptions(options);

  // env already contains secrets
  const env = { ...process.env, PROVIDER_URL: options.rpc, CHAIN_ID: options.chainId.toString() };

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

  const spawned = spawn('npx', args, { env, shell: true });
  spawned.stdout.pipe(process.stdout);
  spawned.stderr.pipe(process.stderr);
  await new Promise(resolve => spawned.on('exit', resolve));
}

main()
  .then(() => {
    process.exit();
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
