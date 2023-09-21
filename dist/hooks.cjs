'use strict';

var mocha = require('mocha');

const SESSION_ID_EVENT = 'applause-session-id-register';
function registerSessionIdHook(sessionIdLookup) {
    return function () {
        if (this.test instanceof mocha.Hook &&
            !this.test.title.startsWith('"before each"')) {
            console.warn('Can only register session id in the beforeEach hook');
            return;
        }
        registerSessionId.apply(this, [sessionIdLookup()]);
    };
}
function registerSessionId(sessionId) {
    // this: Mocha.Context can be executed for either a Hook for a test. If this is being executed for a Hook,
    // we want to emit the event on the currentTest, not the test (which is actually the hook)
    if (this.test instanceof mocha.Test) {
        this.test?.emit(SESSION_ID_EVENT, JSON.stringify({ fullTitle: this.test?.fullTitle(), sessionId }));
    }
    else if (this.test instanceof mocha.Hook && this.currentTest instanceof mocha.Test) {
        this.currentTest?.emit(SESSION_ID_EVENT, JSON.stringify({ fullTitle: this.currentTest?.fullTitle(), sessionId }));
    }
}

exports.SESSION_ID_EVENT = SESSION_ID_EVENT;
exports.registerSessionId = registerSessionId;
exports.registerSessionIdHook = registerSessionIdHook;
//# sourceMappingURL=hooks.cjs.map
