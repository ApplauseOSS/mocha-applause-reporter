import { reporters } from 'mocha';

import {
  ApplauseReporter,
  TestResultStatus,
  loadConfig,
} from 'applause-reporter-common';
import { Runner } from 'mocha';
import { Test } from 'mocha';
import { SESSION_ID_EVENT } from './hooks.ts';

export default class ApplauseMochaReporter extends reporters.Base {
  private reporter: ApplauseReporter;
  private sessionIdMap: Map<string, string[]> = new Map();

  constructor(runner: Runner) {
    super(runner);
    const config = loadConfig();
    this.reporter = new ApplauseReporter(config);

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
        this.listenToSessionId(testcase);
        void this.reporter.startTestCase(testcase.id, testcase.fullTitle());
      })
      .on(Runner.constants.EVENT_TEST_PASS, (testcase: Test) => {
        void this.reporter.submitTestCaseResult(
          testcase.id,
          TestResultStatus.PASSED,
          { providerSessionGuids: this.sessionIdMap.get(testcase.id) || [] }
        );
      })
      .on(Runner.constants.EVENT_TEST_PENDING, (testcase: Test) => {
        void this.reporter.submitTestCaseResult(
          testcase.id,
          TestResultStatus.SKIPPED,
          { providerSessionGuids: this.sessionIdMap.get(testcase.id) || [] }
        );
      })
      .on(Runner.constants.EVENT_TEST_FAIL, (testcase: Test, error: Error) => {
        void this.reporter.submitTestCaseResult(
          testcase.id,
          TestResultStatus.FAILED,
          {
            failureReason: error.message,
            providerSessionGuids: this.sessionIdMap.get(testcase.id) || [],
          }
        );
      })
      .once(Runner.constants.EVENT_RUN_END, () => {
        void this.reporter.runnerEnd();
      });
  }

  private recordSessionId(id: string, sessionId: string) {
    this.sessionIdMap.set(id, [
      ...(this.sessionIdMap.get(id) || []),
      sessionId,
    ]);
  }

  private listenToSessionId(test: Test): void {
    test.on(SESSION_ID_EVENT, (sessionId: string) =>
      this.recordSessionId(test.id, sessionId)
    );
  }
}
