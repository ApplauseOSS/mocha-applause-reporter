import { reporters, Runner } from 'mocha';
import { AutoApi, TestResultStatus, TestRunHeartbeatService } from 'auto-api-client-js';
import { writeFileSync } from 'fs';
import { join } from 'path';

const _options = require(process.cwd() + '/applause.json');
const options = _options;
// import * as cli from 'mocha/lib/cli';
class ApplauseReporter extends reporters.Base {
    /**
     * overwrite isSynchronised method
     */
    get isSynchronised() {
        return this.autoapi === undefined
            ? false
            : this.autoapi.getCallsInFlight === 0;
    }
    constructor(runner) {
        super(runner);
        this.TEST_RAIL_CASE_ID_PREFIX = 'TestRail-';
        this.APPLAUSE_CASE_ID_PREFIX = 'Applause-';
        this.testRunId = Promise.resolve(0);
        this.uidToResultIdMap = {};
        this.uidSubmissionMap = {};
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
            const tests = [];
            suite.eachTest(t => tests.push(this.parseTestCaseName(t.fullTitle()).testCaseName));
            void this.runnerStart(tests);
        });
        /*
         * make reporter to write to the output stream by default
         */
        runner
            .on(Runner.constants.EVENT_TEST_BEGIN, (testcase) => {
            void this.startTestResult(testcase.id, testcase.fullTitle());
        })
            .on(Runner.constants.EVENT_TEST_PASS, (testcase) => {
            void this.submitTestResult(testcase.id, TestResultStatus.PASSED);
        })
            .on(Runner.constants.EVENT_TEST_FAIL, (testcase, error) => {
            void this.submitTestResult(testcase.id, TestResultStatus.FAILED, error.message);
        })
            .once(Runner.constants.EVENT_RUN_END, () => {
            void this.runnerEnd();
        });
    }
    runnerStart(tests) {
        this.testRunId = this.autoapi
            .startTestRun({
            tests,
        })
            .then(response => {
            const runId = response.data.runId;
            console.log('Test Run %d initialized', runId);
            this.heartbeat = new TestRunHeartbeatService(runId, this.autoapi);
            // Start up the TestRun heartbeat service acynchronously
            void this.heartbeat.start();
            return runId;
        });
    }
    startTestResult(id, testCaseName) {
        const parsedTestCase = this.parseTestCaseName(testCaseName);
        this.uidToResultIdMap[id] = this.testRunId
            ?.then(runId => this.autoapi.startTestCase({
            testCaseName: parsedTestCase.testCaseName,
            testCaseId: parsedTestCase.testRailTestCaseId,
            testRunId: runId,
            providerSessionIds: [],
        }))
            .then(res => {
            return res.data.testResultId;
        });
    }
    submitTestResult(id, status, errorMessage) {
        this.uidSubmissionMap[id] = this.uidToResultIdMap[id]?.then(resultId => this.autoapi.submitTestResult({
            status: status,
            testResultId: resultId,
            failureReason: errorMessage,
        }));
    }
    async runnerEnd() {
        // End the heartbeat if applicable
        await this.heartbeat?.end();
        let resultIds = [];
        const valuePromises = Object.values(this.uidToResultIdMap);
        // Wait for all results to be created
        void (await Promise.all(valuePromises)
            .then(vals => (resultIds = vals == null ? [] : vals))
            .catch((reason) => {
            console.error(`Unable to retrieve Applause TestResultIds ${reason.message}`);
        }));
        const resultPromises = Object.values(this.uidSubmissionMap);
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
            writeFileSync(join(outputPath, 'providerUrls.txt'), JSON.stringify(jsonArray, null, 1));
        }
    }
    parseTestCaseName(testCaseName) {
        // Split the name on spaces. We will reassemble after parsing out the other ids
        const tokens = testCaseName.split(' ');
        let testRailTestCaseId;
        let applauseTestCaseId;
        tokens.forEach(token => {
            if (token?.startsWith(this.TEST_RAIL_CASE_ID_PREFIX)) {
                if (testRailTestCaseId !== undefined) {
                    console.warn('Multiple TestRail case ids detected in testCase name');
                }
                testRailTestCaseId = token.substring(this.TEST_RAIL_CASE_ID_PREFIX.length);
            }
            else if (token?.startsWith(this.APPLAUSE_CASE_ID_PREFIX)) {
                if (applauseTestCaseId !== undefined) {
                    console.warn('Multiple Applause case ids detected in testCase name');
                }
                applauseTestCaseId = token.substring(this.APPLAUSE_CASE_ID_PREFIX.length);
            }
        });
        return {
            applauseTestCaseId,
            testRailTestCaseId,
            testCaseName: tokens
                .filter(token => token !==
                `${this.TEST_RAIL_CASE_ID_PREFIX}${testRailTestCaseId || ''}`)
                .filter(token => token !==
                `${this.APPLAUSE_CASE_ID_PREFIX}${applauseTestCaseId || ''}`)
                .join(' '),
        };
    }
}

export { ApplauseReporter as default };
//# sourceMappingURL=index.mjs.map
