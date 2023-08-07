interface IBasicConsole {
    log(...args: any[]): void;
    debug(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
}
export declare class ConsoleSanitizer<T extends IBasicConsole> {
    protected secrets: Record<string, string>;
    constructor(secrets: Record<string, string>);
    get(target: T, prop: string): any;
    format(...args: any[]): string[];
}
export {};
