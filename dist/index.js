'use strict';

var mocha = require('mocha');
var autoApiClientJs = require('auto-api-client-js');
var fs = require('fs');
var path = require('path');

const _options = require(process.cwd() + '/applause.json');
const options = _options;
// import * as cli from 'mocha/lib/cli';
class ApplauseReporter extends mocha.reporters.Base {
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
        this.uidToResultIdMap = {};
        this.autoapi = new autoApiClientJs.AutoApi({
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
            .on(mocha.Runner.constants.EVENT_TEST_BEGIN, (testcase) => {
            this.uidToResultIdMap[testcase.id] = this.autoapi
                .startTestCase(testcase.fullTitle())
                .then(res => {
                return res.data.testResultId;
            });
        })
            .on(mocha.Runner.constants.EVENT_TEST_PASS, (testcase) => {
            void this.submitTestResult(testcase.id, autoApiClientJs.TestResultStatus.PASSED);
        })
            .on(mocha.Runner.constants.EVENT_TEST_FAIL, (testcase, error) => {
            void this.submitTestResult(testcase.id, autoApiClientJs.TestResultStatus.FAILED, error.message);
        })
            .once(mocha.Runner.constants.EVENT_RUN_END, () => {
            void this.runnerEnd();
        });
    }
    async submitTestResult(id, status, errorMessage) {
        return this.autoapi.submitTestResult(await this.uidToResultIdMap[id], status, errorMessage);
    }
    async runnerEnd() {
        const valuePromises = Object.values(this.uidToResultIdMap);
        let resultIds = [];
        void (await Promise.all(valuePromises)
            .then(vals => (resultIds = vals == null ? [] : vals))
            .catch((reason) => {
            console.error(`Unable to retrieve Applause TestResultIds ${reason.message}`);
        }));
        const resp = await this.autoapi.getProviderSessionLinks(resultIds);
        const jsonArray = resp.data || [];
        if (jsonArray.length > 0) {
            console.info(JSON.stringify(jsonArray));
            // this is the wdio.conf outputDir
            const outputPath = '.';
            fs.writeFileSync(path.join(outputPath, 'providerUrls.txt'), JSON.stringify(jsonArray, null, 1));
        }
    }
}

module.exports = ApplauseReporter;
//# sourceMappingURL=index.js.map
