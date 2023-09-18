import { reporters, Runner } from 'mocha';
import { ApplauseReporter, TestResultStatus } from 'applause-reporter-common';

const _options = require(process.cwd() + '/applause.json');
const options = _options;
// import * as cli from 'mocha/lib/cli';
class ApplauseMochaReporter extends reporters.Base {
    reporter;
    constructor(runner) {
        super(runner);
        this.reporter = new ApplauseReporter(options);
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
