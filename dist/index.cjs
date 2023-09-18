'use strict';

var mocha = require('mocha');
var applauseReporterCommon = require('applause-reporter-common');

// import * as cli from 'mocha/lib/cli';
class ApplauseMochaReporter extends mocha.reporters.Base {
    reporter;
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
            void this.reporter.startTestCase(testcase.id, testcase.fullTitle());
        })
            .on(mocha.Runner.constants.EVENT_TEST_PASS, (testcase) => {
            void this.reporter.submitTestCaseResult(testcase.id, applauseReporterCommon.TestResultStatus.PASSED);
        })
            .on(mocha.Runner.constants.EVENT_TEST_FAIL, (testcase, error) => {
            void this.reporter.submitTestCaseResult(testcase.id, applauseReporterCommon.TestResultStatus.FAILED, { failureReason: error.message });
        })
            .once(mocha.Runner.constants.EVENT_RUN_END, () => {
            void this.reporter.runnerEnd();
        });
    }
}

module.exports = ApplauseMochaReporter;
//# sourceMappingURL=index.cjs.map
