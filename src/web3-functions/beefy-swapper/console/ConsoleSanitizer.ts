import { sanitizeValue, valueToString } from '../utils';

interface IBasicConsole {
  log(...args: any[]): void;

  debug(...args: any[]): void;

  warn(...args: any[]): void;

  error(...args: any[]): void;
}

export class ConsoleSanitizer<T extends IBasicConsole> {
  constructor(protected secrets: Record<string, string>) {}

  get(target: T, prop: string): any {
    if (['log', 'debug', 'warn', 'error'].includes(prop)) {
      return (...args: any[]) => {
        target[prop](...this.format(...args));
      };
    }

    return target.error(`Sanitization of console.${prop} not implemented`);
  }

  format(...args: any[]): string[] {
    return args.map(arg => sanitizeValue(arg, this.secrets));
  }
}
