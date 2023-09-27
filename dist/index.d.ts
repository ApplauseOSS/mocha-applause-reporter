import { reporters, Runner } from 'mocha';

declare const SESSION_ID_EVENT = "applause-session-id-register";
declare function registerSessionIdHook(sessionIdLookup: () => string | undefined): (this: Mocha.Context) => void;
declare function registerSessionId(this: Mocha.Context, sessionId: string | undefined): void;

declare class ApplauseMochaReporter extends reporters.Base {
    private reporter;
    private sessionIdMap;
    constructor(runner: Runner);
    private recordSessionId;
    private listenToSessionId;
}

export { SESSION_ID_EVENT, ApplauseMochaReporter as default, registerSessionId, registerSessionIdHook };
