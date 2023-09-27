import { Hook, Test } from 'mocha';

export const SESSION_ID_EVENT = 'applause-session-id-register';

export function registerSessionIdHook(
  sessionIdLookup: () => string | undefined
) {
  return function (this: Mocha.Context) {
    if (
      this.test instanceof Hook &&
      !this.test.title.startsWith('"before each"')
    ) {
      console.warn('Can only register session id in the beforeEach hook');
      return;
    }
    registerSessionId.apply(this, [sessionIdLookup()]);
  };
}

export function registerSessionId(
  this: Mocha.Context,
  sessionId: string | undefined
) {
  // this: Mocha.Context can be executed for either a Hook for a test. If this is being executed for a Hook,
  // we want to emit the event on the currentTest, not the test (which is actually the hook)
  if (this.test instanceof Test) {
    this.test?.emit(SESSION_ID_EVENT, sessionId);
  } else if (this.test instanceof Hook && this.currentTest instanceof Test) {
    this.currentTest?.emit(SESSION_ID_EVENT, sessionId);
  }
}
