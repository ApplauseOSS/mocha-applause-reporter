import { reporters, Runner } from 'mocha';
import { TestResultStatus } from 'auto-api-client-js';

declare class ApplauseReporter extends reporters.Base {
    private autoapi;
    private uidToResultIdMap;
    /**
     * overwrite isSynchronised method
     */
    get isSynchronised(): boolean;
    constructor(runner: Runner);
    submitTestResult(id: string, status: TestResultStatus, errorMessage?: string): Promise<void>;
    runnerEnd(): Promise<void>;
}

export { ApplauseReporter as default };
