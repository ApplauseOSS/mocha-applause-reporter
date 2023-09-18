import { reporters } from 'mocha';

import {
  ApplauseConfig,
  ApplauseReporter,
  TestResultStatus,
} from 'applause-reporter-common';
import { Runner } from 'mocha';
import { Test } from 'mocha';
const _options = require(process.cwd() + '/applause.json');
const options = _options as ApplauseConfig;

// import * as cli from 'mocha/lib/cli';
export default class ApplauseMochaReporter extends reporters.Base {
  private reporter: ApplauseReporter;

  constructor(runner: Runner) {
    super(runner);
    this.reporter = new ApplauseReporter(options);

    runner.once(Runner.constants.EVENT_SUITE_BEGIN, suite => {
      // Parse each test case name from the suite
      const tests: string[] = [];
      suite.eachTest(t => tests.push(t.fullTitle()));
      void this.reporter.runnerStart(tests);
    });
    /*
     * make reporter to write to the output stream by default
     */
    runner
      .on(Runner.constants.EVENT_TEST_BEGIN, (testcase: Test) => {
        void this.reporter.startTestCase(testcase.id, testcase.fullTitle());
      })
      .on(Runner.constants.EVENT_TEST_PASS, (testcase: Test) => {
        void this.reporter.submitTestCaseResult(
          testcase.id,
          TestResultStatus.PASSED
        );
      })
      .on(Runner.constants.EVENT_TEST_FAIL, (testcase: Test, error: Error) => {
        void this.reporter.submitTestCaseResult(
          testcase.id,
          TestResultStatus.FAILED,
          { failureReason: error.message }
        );
      })
      .once(Runner.constants.EVENT_RUN_END, () => {
        void this.reporter.runnerEnd();
      });
  }
}
