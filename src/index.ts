import { reporters } from 'mocha';

// eslint-disable-next-line node/no-extraneous-import
import { AutoApi, TestResultStatus } from 'auto-api-client-js';
import { Runner } from 'mocha';
import { ApplauseOptions } from './applause-options';
import { Test } from 'mocha';
import { writeFileSync } from 'fs';
import { join as pathJoin } from 'path';
const _options = require(process.cwd() + '/applause.json');
const options = _options as ApplauseOptions;

// import * as cli from 'mocha/lib/cli';

export default class ApplauseReporter extends reporters.Base {
  private autoapi: AutoApi;
  private uidToResultIdMap: Record<string, Promise<number>> = {};

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
      groupingName: options.groupingName,
    });
    /*
     * make reporter to write to the output stream by default
     */
    runner
      .on(Runner.constants.EVENT_TEST_BEGIN, (testcase: Test) => {
        this.uidToResultIdMap[testcase.id] = this.autoapi
          .startTestCase(testcase.fullTitle())
          .then(res => {
            return res.data.testResultId;
          });
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

  async submitTestResult(
    id: string,
    status: TestResultStatus,
    errorMessage?: string
  ): Promise<void> {
    return this.autoapi.submitTestResult(
      await this.uidToResultIdMap[id],
      status,
      errorMessage
    );
  }

  async runnerEnd(): Promise<void> {
    const valuePromises: Promise<number>[] = Object.values(
      this.uidToResultIdMap
    );
    let resultIds: number[] = [];
    void (await Promise.all(valuePromises)
      .then(vals => (resultIds = vals == null ? [] : vals))
      .catch((reason: Error) => {
        console.error(
          `Unable to retrieve Applause TestResultIds ${reason.message}`
        );
      }));
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
}
