import { reporters, Runner } from 'mocha';

declare class ApplauseMochaReporter extends reporters.Base {
    private reporter;
    private sessionIdMap;
    constructor(runner: Runner);
    private recordSessionId;
    private listenToSessionId;
}

export { ApplauseMochaReporter as default };
