'use strict';

var mocha = require('mocha');
var applauseReporterCommon = require('applause-reporter-common');

const SESSION_ID_EVENT = 'applause-session-id-register';

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

module.exports = ApplauseMochaReporter;
//# sourceMappingURL=index.cjs.map
