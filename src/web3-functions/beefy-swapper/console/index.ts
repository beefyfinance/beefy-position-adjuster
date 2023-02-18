import { ConsoleSanitizer } from './ConsoleSanitizer';

export function installConsoleSanitizer(secrets: Record<string, string>): void {
  globalThis.console = new Proxy(globalThis.console, new ConsoleSanitizer(secrets));
}
