import { stat } from 'node:fs/promises';
import { git, isClean, currentBranch } from '../git/git.js';
import type { Finding, HeadbangConfig, Profile } from '../types.js';
import { runShell } from '../utils/process.js';
import { validateBranch } from '../workflow.js';
import { validateCommitMessage } from './conventional.js';

export interface ReviewOptions {
  headRef?: string;
  enforceBranchPolicy?: boolean;
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
  const range = `${base}...${headRef}`;
  const diff = await git(repo, ['diff', '--stat', range], true);
  const names = await git(repo, ['diff', '--name-only', range], true);
  const files = names.stdout.split(/\r?\n/).filter(Boolean);

  if (profile.requireConventionalCommits) {
    const log = await git(repo, ['log', '--format=%s', range], true);
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
      const info = await stat(`${repo}/${file}`);
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

  const taskNames = profile.review?.tasks ?? [];
  const tasks = [] as any[];

  for (const name of taskNames) {
    const def = profile.tasks?.[name] ?? config.tasks?.[name];
    if (!def) {
      findings.push({ severity: 'high', category: 'config', message: `Review task '${name}' is not defined.` });
      continue;
    }

    const result = await runShell(def.command, {
      cwd: def.cwd ? `${repo}/${def.cwd}` : repo,
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

  return {
    branch,
    headRef,
    base,
    branchPolicy,
    clean,
    files,
    diffStat: diff.stdout,
    tasks,
    findings
  };
}
