declare const SESSION_ID_EVENT = "applause-session-id-register";
declare function registerSessionIdHook(sessionIdLookup: () => string | undefined): (this: Mocha.Context) => void;
declare function registerSessionId(this: Mocha.Context, sessionId: string | undefined): void;

export { SESSION_ID_EVENT, registerSessionId, registerSessionIdHook };
