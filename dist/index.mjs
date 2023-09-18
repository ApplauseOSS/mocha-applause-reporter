import { reporters, Runner } from 'mocha';
import { loadConfig, ApplauseReporter, TestResultStatus } from 'applause-reporter-common';

// import * as cli from 'mocha/lib/cli';
class ApplauseMochaReporter extends reporters.Base {
    reporter;
    constructor(runner) {
        super(runner);
        const config = loadConfig();
        this.reporter = new ApplauseReporter(config);
        runner.once(Runner.constants.EVENT_SUITE_BEGIN, suite => {
            // Parse each test case name from the suite
            const tests = [];
            suite.eachTest(t => tests.push(t.fullTitle()));
            void this.reporter.runnerStart(tests);
        });
        /*
         * make reporter to write to the output stream by default
         */
        runner
            .on(Runner.constants.EVENT_TEST_BEGIN, (testcase) => {
            void this.reporter.startTestCase(testcase.id, testcase.fullTitle());
        })
            .on(Runner.constants.EVENT_TEST_PASS, (testcase) => {
            void this.reporter.submitTestCaseResult(testcase.id, TestResultStatus.PASSED);
        })
            .on(Runner.constants.EVENT_TEST_FAIL, (testcase, error) => {
            void this.reporter.submitTestCaseResult(testcase.id, TestResultStatus.FAILED, { failureReason: error.message });
        })
            .once(Runner.constants.EVENT_RUN_END, () => {
            void this.reporter.runnerEnd();
        });
    }
}

export { ApplauseMochaReporter as default };
//# sourceMappingURL=index.mjs.map
