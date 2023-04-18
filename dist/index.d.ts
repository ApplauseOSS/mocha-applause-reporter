import { reporters, Runner } from 'mocha';

declare class ApplauseReporter extends reporters.Base {
    private autoapi;
    private uidToResultIdMap;
    /**
     * overwrite isSynchronised method
     */
    get isSynchronised(): boolean;
    constructor(runner: Runner);
}

export { ApplauseReporter as default };
