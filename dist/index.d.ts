import { reporters, Runner } from 'mocha';

declare class ApplauseMochaReporter extends reporters.Base {
    private reporter;
    constructor(runner: Runner);
}

export { ApplauseMochaReporter as default };
