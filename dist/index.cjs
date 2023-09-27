'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var mocha = require('mocha');
var applauseReporterCommon = require('applause-reporter-common');

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
        this.test?.emit(SESSION_ID_EVENT, sessionId);
    }
    else if (this.test instanceof mocha.Hook && this.currentTest instanceof mocha.Test) {
        this.currentTest?.emit(SESSION_ID_EVENT, sessionId);
    }
}

class ApplauseMochaReporter extends mocha.reporters.Base {
    reporter;
    sessionIdMap = new Map();
    constructor(runner) {
        super(runner);
        const config = applauseReporterCommon.loadConfig();
        this.reporter = new applauseReporterCommon.ApplauseReporter(config);
        runner.once(mocha.Runner.constants.EVENT_SUITE_BEGIN, suite => {
            // Parse each test case name from the suite
            const tests = [];
            suite.eachTest(t => tests.push(t.fullTitle()));
            void this.reporter.runnerStart(tests);
        });
        /*
         * make reporter to write to the output stream by default
         */
        runner
            .on(mocha.Runner.constants.EVENT_TEST_BEGIN, (testcase) => {
            this.listenToSessionId(testcase);
            void this.reporter.startTestCase(testcase.id, testcase.fullTitle());
        })
            .on(mocha.Runner.constants.EVENT_TEST_PASS, (testcase) => {
            void this.reporter.submitTestCaseResult(testcase.id, applauseReporterCommon.TestResultStatus.PASSED, { providerSessionGuids: this.sessionIdMap.get(testcase.id) || [] });
        })
            .on(mocha.Runner.constants.EVENT_TEST_PENDING, (testcase) => {
            void this.reporter.submitTestCaseResult(testcase.id, applauseReporterCommon.TestResultStatus.SKIPPED, { providerSessionGuids: this.sessionIdMap.get(testcase.id) || [] });
        })
            .on(mocha.Runner.constants.EVENT_TEST_FAIL, (testcase, error) => {
            void this.reporter.submitTestCaseResult(testcase.id, applauseReporterCommon.TestResultStatus.FAILED, {
                failureReason: error.message,
                providerSessionGuids: this.sessionIdMap.get(testcase.id) || [],
            });
        })
            .once(mocha.Runner.constants.EVENT_RUN_END, () => {
            void this.reporter.runnerEnd();
        });
    }
    recordSessionId(id, sessionId) {
        this.sessionIdMap.set(id, [
            ...(this.sessionIdMap.get(id) || []),
            sessionId,
        ]);
    }
    listenToSessionId(test) {
        test.on(SESSION_ID_EVENT, (sessionId) => this.recordSessionId(test.id, sessionId));
    }
}

exports.SESSION_ID_EVENT = SESSION_ID_EVENT;
exports.default = ApplauseMochaReporter;
exports.registerSessionId = registerSessionId;
exports.registerSessionIdHook = registerSessionIdHook;
//# sourceMappingURL=index.cjs.map
