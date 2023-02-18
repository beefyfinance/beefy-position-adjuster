# Web3Functions

## Testing

`$ yarn run test --function=beefy-swapper`

### CLI arguments
- `--function=function-name` - Name of folder under src/web3-functions to test
- `--debug` - Run test in debug mode
- `--showLogs` - Show logs from test
- `--userArgs=key:value [--userArgs=key:value]` - Set user arguments for test
- `--userFile=path/to/file.json` - Set user arguments for tests from a JSON file
- `--chainId=number` - Set the chain ID for test
- `--rpc=url` - Set the RPC URL for test

### Environment Variables
- `PROVIDER_URL` - RPC URL for test
- `CHAIN_ID` - Chain ID for test
- `SECRETS_*` - Secrets for test

#### Notes
- CLI arguments take precedence over environment variables
- userArgs takes precedence over userFile
- If neither userArgs nor userFile are set, the test will try to use user-args.json in the function folder, then root of the project

### Secrets
Set secrets in .env file in the root of the project.
e.g. `SECRETS_API_KEY` will expose a secret of `API_KEY` via `context.secrets.get("API_KEY")`

### User Arguments
To set user arguments for tests, use one of the following methods:
- Pass one or more --user-args:key:value arguments to the test command
- Create a user-args.json file containing a JSON object with key/value pairs
  - By default, 

### Windows users
Set `DENO_PATH=""./node_modules/deno-bin/bin/deno""` in your .env file or `yarn test` will not work.
