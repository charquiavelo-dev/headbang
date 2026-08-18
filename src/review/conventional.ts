export const conventionalRe=/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._/-]+\))?(!)?: .{1,100}$/;
export function validateCommitMessage(message:string){ const first=message.split(/\r?\n/)[0]??''; const valid=conventionalRe.test(first); return {valid,subject:first,error:valid?undefined:'Expected Conventional Commit: type(scope): subject'}; }
