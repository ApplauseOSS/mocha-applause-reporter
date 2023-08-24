import { reporters, Runner } from 'mocha';
import { TestResultStatus } from 'auto-api-client-js';

declare class ApplauseReporter extends reporters.Base {
    private readonly TEST_RAIL_CASE_ID_PREFIX;
    private readonly APPLAUSE_CASE_ID_PREFIX;
    private autoapi;
    private testRunId;
    private heartbeat?;
    private uidToResultIdMap;
    private uidSubmissionMap;
    /**
     * overwrite isSynchronised method
     */
    get isSynchronised(): boolean;
    constructor(runner: Runner);
    runnerStart(tests: string[]): void;
    startTestResult(id: string, testCaseName: string): void;
    submitTestResult(id: string, status: TestResultStatus, errorMessage?: string): void;
    runnerEnd(): Promise<void>;
    private parseTestCaseName;
}

export { ApplauseReporter as default };
