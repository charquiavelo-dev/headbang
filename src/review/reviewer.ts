import { stat } from 'node:fs/promises';
import { resolveWithin } from '../utils/path.js';
import { createHash } from 'node:crypto';
import { git, isClean, currentBranch } from '../git/git.js';
import type { Finding, HeadbangConfig, Profile } from '../types.js';
import { runShell } from '../utils/process.js';
import { validateBranch } from '../workflow.js';
import { validateCommitMessage } from './conventional.js';

export interface ReviewOptions {
  headRef?: string;
  enforceBranchPolicy?: boolean;
  scope?: 'working-tree'|'staged'|'branch'|'commit'|'change-request';
  commit?: string;
  runTasks?: boolean;
}

export async function reviewRepo(
  repo: string,
  profile: Profile,
  config: HeadbangConfig,
  options: ReviewOptions = {}
) {
  const findings: Finding[] = [];
  const branch = await currentBranch(repo);
  const headRef = options.headRef ?? 'HEAD';

  const branchPolicy = validateBranch(branch, profile.branch);
  if (options.enforceBranchPolicy !== false && !branchPolicy.allowed) {
    findings.push({
      severity: 'high',
      category: 'branch-policy',
      message: `Branch '${branch}' violates ${branchPolicy.strategy}: ${branchPolicy.reason}`
    });
  }

  const clean = await isClean(repo);
  if (profile.requireClean && !clean) {
    findings.push({ severity: 'high', category: 'git', message: 'Working tree is not clean.' });
  }

  const base = profile.branch?.main ?? 'main';
  const scope=options.scope??profile.review?.scope??'branch';
  if(scope==='change-request')throw new Error('Change-request review requires provider-supplied base and head refs; local inference is not safe.');
  const diffArgs=scope==='working-tree'?[]:scope==='staged'?['--cached']:scope==='commit'?[`${options.commit??headRef}^!`]:[`${base}...${headRef}`];
  const range = diffArgs[0]??'working-tree';
  const diff = await git(repo, ['diff', '--stat', ...diffArgs], true);
  const names = await git(repo, ['diff', '--name-only', ...diffArgs], true);
  if(diff.exitCode!==0)throw new Error(`Unable to inspect review diff: ${diff.stderr||diff.stdout}`);
  if(names.exitCode!==0)throw new Error(`Unable to list review files: ${names.stderr||names.stdout}`);
  let files = names.stdout.split(/\r?\n/).filter(Boolean);
  if(scope==='working-tree'){
    const untracked=await git(repo,['ls-files','--others','--exclude-standard'],true);
    if(untracked.exitCode!==0)throw new Error(`Unable to list untracked files: ${untracked.stderr||untracked.stdout}`);
    files=[...new Set([...files,...untracked.stdout.split(/\r?\n/).filter(Boolean)])];
  }

  if (profile.requireConventionalCommits) {
    const commitRange = scope === 'working-tree' || scope === 'staged' ? `${base}...${headRef}` : range;
    const log = await git(repo, ['log', '--format=%s', commitRange], true);
    if(log.exitCode!==0)throw new Error(`Unable to inspect commit messages: ${log.stderr||log.stdout}`);
    for (const subject of log.stdout.split(/\r?\n/).filter(Boolean)) {
      const result = validateCommitMessage(subject);
      if (!result.valid) {
        findings.push({
          severity: 'high',
          category: 'commit-policy',
          message: `Non-conventional commit: ${subject}`
        });
      }
    }
  }

  for (const file of files) {
    try {
      const info = await stat(resolveWithin(repo,file,'review file'));
      if (info.size > 1_000_000) {
        findings.push({
          severity: 'medium',
          category: 'size',
          file,
          message: 'Changed file is larger than 1 MB.'
        });
      }
    } catch {}
  }

  const taskNames = options.runTasks===false?[]:(profile.review?.tasks ?? []);
  const tasks = [] as any[];

  for (const name of taskNames) {
    const def = profile.tasks?.[name] ?? config.tasks?.[name];
    if (!def) {
      findings.push({ severity: 'high', category: 'config', message: `Review task '${name}' is not defined.` });
      continue;
    }

    const result = await runShell(def.command, {
      cwd: def.cwd ? resolveWithin(repo,def.cwd,`task '${name}' cwd`) : repo,
      timeoutMs: def.timeoutMs ?? 120000
    });

    tasks.push({ ...result, name });
    if (result.exitCode !== 0) {
      findings.push({
        severity: 'high',
        category: 'quality-gate',
        message: `Task '${name}' failed with exit code ${result.exitCode}.`
      });
    }
  }

  for(const finding of findings){finding.fingerprint=createHash('sha256').update(`${finding.category}\0${finding.file??''}\0${finding.line??''}\0${finding.message}`).digest('hex').slice(0,24);finding.state='new';finding.rationale??=finding.message;}
  return {
    branch,
    headRef,
    base,
    scope,
    branchPolicy,
    clean,
    files,
    diffStat: diff.stdout,
    tasks,
    findings
  };
}
