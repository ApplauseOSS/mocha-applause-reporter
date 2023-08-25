import { reporters } from 'mocha';

// eslint-disable-next-line node/no-extraneous-import
import {
  AutoApi,
  TestResultStatus,
  TestRunHeartbeatService,
} from 'auto-api-client-js';
import { Runner } from 'mocha';
import { ApplauseOptions } from './applause-options';
import { Test } from 'mocha';
import { writeFileSync } from 'fs';
import { join as pathJoin } from 'path';
const _options = require(process.cwd() + '/applause.json');
const options = _options as ApplauseOptions;

// import * as cli from 'mocha/lib/cli';
export default class ApplauseReporter extends reporters.Base {
  private readonly TEST_RAIL_CASE_ID_PREFIX: string = 'TestRail-';
  private readonly APPLAUSE_CASE_ID_PREFIX: string = 'Applause-';

  private autoapi: AutoApi;
  private testRunId: Promise<number> = Promise.resolve(0);
  private heartbeat?: TestRunHeartbeatService;
  private heartbeatStarted?: Promise<void>;
  private uidToResultIdMap: Record<string, Promise<number>> = {};
  private uidSubmissionMap: Record<string, Promise<void>> = {};

  /**
   * overwrite isSynchronised method
   */
  get isSynchronised(): boolean {
    return this.autoapi === undefined
      ? false
      : this.autoapi.getCallsInFlight === 0;
  }

  constructor(runner: Runner) {
    super(runner);
    this.autoapi = new AutoApi({
      clientConfig: {
        baseUrl: options.baseUrl,
        apiKey: options.apiKey,
      },
      productId: options.productId,
      testRailOptions: options.testRail,
    });
    runner.once(Runner.constants.EVENT_SUITE_BEGIN, suite => {
      // Parse each test case name from the suite
      const tests: string[] = [];
      suite.eachTest(t =>
        tests.push(this.parseTestCaseName(t.fullTitle()).testCaseName)
      );
      void this.runnerStart(tests);
    });
    /*
     * make reporter to write to the output stream by default
     */
    runner
      .on(Runner.constants.EVENT_TEST_BEGIN, (testcase: Test) => {
        void this.startTestResult(testcase.id, testcase.fullTitle());
      })
      .on(Runner.constants.EVENT_TEST_PASS, (testcase: Test) => {
        void this.submitTestResult(testcase.id, TestResultStatus.PASSED);
      })
      .on(Runner.constants.EVENT_TEST_FAIL, (testcase: Test, error: Error) => {
        void this.submitTestResult(
          testcase.id,
          TestResultStatus.FAILED,
          error.message
        );
      })
      .once(Runner.constants.EVENT_RUN_END, () => {
        void this.runnerEnd();
      });
  }

  runnerStart(tests: string[]): void {
    this.testRunId = this.autoapi
      .startTestRun({
        tests,
      })
      .then(response => {
        const runId = response.data.runId;
        console.log('Test Run %d initialized', runId);
        this.heartbeat = new TestRunHeartbeatService(runId, this.autoapi);
        this.heartbeatStarted = this.heartbeat.start();
        return runId;
      });
  }

  startTestResult(id: string, testCaseName: string): void {
    const parsedTestCase = this.parseTestCaseName(testCaseName);
    this.uidToResultIdMap[id] = this.testRunId
      ?.then(runId =>
        this.autoapi.startTestCase({
          testCaseName: parsedTestCase.testCaseName,
          testCaseId: parsedTestCase.testRailTestCaseId,
          testRunId: runId,
          providerSessionIds: [],
        })
      )
      .then(res => {
        return res.data.testResultId;
      });
  }

  submitTestResult(
    id: string,
    status: TestResultStatus,
    errorMessage?: string
  ): void {
    this.uidSubmissionMap[id] = this.uidToResultIdMap[id]?.then(resultId =>
      this.autoapi.submitTestResult({
        status: status,
        testResultId: resultId,
        failureReason: errorMessage,
      })
    );
  }

  async runnerEnd(): Promise<void> {
    // Wait for the test run to be created and the heartbeat to be started
    await this.testRunId;
    await this.heartbeatStarted;
    // End the heartbeat
    await this.heartbeat?.end();
    let resultIds: number[] = [];
    const valuePromises: Promise<number>[] = Object.values(
      this.uidToResultIdMap
    );

    // Wait for all results to be created
    void (await Promise.all(valuePromises)
      .then(vals => (resultIds = vals == null ? [] : vals))
      .catch((reason: Error) => {
        console.error(
          `Unable to retrieve Applause TestResultIds ${reason.message}`
        );
      }));
    const resultPromises: Promise<void>[] = Object.values(
      this.uidSubmissionMap
    );

    // Wait for the results to be submitted
    void (await Promise.all(resultPromises));

    // Finally, end the test run
    await this.autoapi.endTestRun((await this.testRunId) || 0);

    // Fetch the provider session asset links
    const resp = await this.autoapi.getProviderSessionLinks(resultIds);
    const jsonArray = resp.data || [];
    if (jsonArray.length > 0) {
      console.info(JSON.stringify(jsonArray));
      // this is the wdio.conf outputDir
      const outputPath = '.';
      writeFileSync(
        pathJoin(outputPath, 'providerUrls.txt'),
        JSON.stringify(jsonArray, null, 1)
      );
    }
  }

  private parseTestCaseName(testCaseName: string): ParsedTestCaseName {
    // Split the name on spaces. We will reassemble after parsing out the other ids
    const tokens = testCaseName.split(' ');
    let testRailTestCaseId: string | undefined;
    let applauseTestCaseId: string | undefined;
    tokens.forEach(token => {
      if (token?.startsWith(this.TEST_RAIL_CASE_ID_PREFIX)) {
        if (testRailTestCaseId !== undefined) {
          console.warn('Multiple TestRail case ids detected in testCase name');
        }
        testRailTestCaseId = token.substring(
          this.TEST_RAIL_CASE_ID_PREFIX.length
        );
      } else if (token?.startsWith(this.APPLAUSE_CASE_ID_PREFIX)) {
        if (applauseTestCaseId !== undefined) {
          console.warn('Multiple Applause case ids detected in testCase name');
        }
        applauseTestCaseId = token.substring(
          this.APPLAUSE_CASE_ID_PREFIX.length
        );
      }
    });
    return {
      applauseTestCaseId,
      testRailTestCaseId,
      testCaseName: tokens
        .filter(
          token =>
            token !==
            `${this.TEST_RAIL_CASE_ID_PREFIX}${testRailTestCaseId || ''}`
        )
        .filter(
          token =>
            token !==
            `${this.APPLAUSE_CASE_ID_PREFIX}${applauseTestCaseId || ''}`
        )
        .join(' '),
    };
  }
}

interface ParsedTestCaseName {
  testCaseName: string;
  testRailTestCaseId?: string;
  applauseTestCaseId?: string;
}
