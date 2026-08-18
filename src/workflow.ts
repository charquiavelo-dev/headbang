import type { BranchConfig, HeadbangConfig, Profile } from './types.js';
import { matches } from './config/glob.js';
import { currentBranch, git, isClean } from './git/git.js';
import { reviewRepo } from './review/reviewer.js';

export type GitFlowKind = 'feature' | 'release' | 'hotfix';
export type GitFlowAction = 'start' | 'finish';

export interface GitFlowOptions {
  review?: boolean;
  deleteBranch?: boolean;
}

function flowConfig(profile: Profile) {
  const branch = profile.branch ?? {};
  if ((branch.strategy ?? 'custom') !== 'git-flow') {
    throw new Error('This profile does not use the git-flow branch strategy.');
  }
  return {
    main: branch.main ?? 'main',
    develop: branch.develop ?? 'develop',
    featurePrefix: branch.featurePrefix ?? 'feature/',
    releasePrefix: branch.releasePrefix ?? 'release/',
    hotfixPrefix: branch.hotfixPrefix ?? 'hotfix/',
    tagPrefix: profile.release?.tagPrefix ?? 'v'
  };
}

function assertFlowPermission(profile: Profile) {
  if (profile.permissions?.flow !== true) {
    throw new Error("Git Flow mutation is disabled for this profile. Set permissions.flow=true to allow it.");
  }
}

function normalizeName(name: string) {
  const value = name.trim().replace(/^\/+|\/+$/g, '');
  if (!value) throw new Error('A branch name/version is required.');
  if (/\s/.test(value)) throw new Error('Git Flow names cannot contain whitespace.');
  if (value.includes('..') || value.includes('~') || value.includes('^') || value.includes(':')) {
    throw new Error(`Unsafe Git Flow name '${value}'.`);
  }
  return value;
}

function isSemVer(value: string) {
  return /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}

async function ensureClean(repo: string) {
  if (!(await isClean(repo))) throw new Error('Working tree must be clean before Git Flow operations.');
}

async function branchExists(repo: string, branch: string) {
  return (await git(repo, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], true)).exitCode === 0;
}

async function tagExists(repo: string, tag: string) {
  return (await git(repo, ['show-ref', '--verify', '--quiet', `refs/tags/${tag}`], true)).exitCode === 0;
}

async function branchSha(repo: string, branch: string) {
  return (await git(repo, ['rev-parse', `refs/heads/${branch}`])).stdout.trim();
}

async function checkout(repo: string, branch: string) {
  await git(repo, ['checkout', branch]);
}

async function mergeNoFf(repo: string, source: string, message: string) {
  await git(repo, ['merge', '--no-ff', source, '-m', message]);
}

async function maybeDelete(repo: string, branch: string, enabled: boolean) {
  if (enabled) await git(repo, ['branch', '-d', branch]);
}

function classify(branch: string, cfg: ReturnType<typeof flowConfig>) {
  if (branch === cfg.main) return { kind: 'main' as const, name: branch };
  if (branch === cfg.develop) return { kind: 'develop' as const, name: branch };
  for (const [kind, prefix] of [
    ['feature', cfg.featurePrefix],
    ['release', cfg.releasePrefix],
    ['hotfix', cfg.hotfixPrefix]
  ] as const) {
    if (branch.startsWith(prefix)) return { kind, name: branch.slice(prefix.length) };
  }
  return { kind: 'other' as const, name: branch };
}

async function rollbackBranch(repo: string, branch: string, sha: string) {
  await checkout(repo, branch);
  await git(repo, ['reset', '--hard', sha]);
}

export function validateBranch(branch: string, cfg: BranchConfig = {}) {
  const strategy = cfg.strategy ?? 'custom';
  const main = cfg.main ?? 'main';
  const develop = cfg.develop ?? 'develop';
  let allowed = true;
  let reason = '';

  if (strategy === 'git-flow') {
    const feature = cfg.featurePrefix ?? 'feature/';
    const release = cfg.releasePrefix ?? 'release/';
    const hotfix = cfg.hotfixPrefix ?? 'hotfix/';
    allowed = branch === main || branch === develop || branch.startsWith(feature) || branch.startsWith(release) || branch.startsWith(hotfix);
    reason = `git-flow permits ${main}, ${develop}, ${feature}*, ${release}* and ${hotfix}*`;
  } else if (strategy === 'github-flow') {
    allowed = branch === main || !branch.startsWith('release/');
    reason = 'github-flow expects short-lived branches targeting main';
  } else if (strategy === 'trunk') {
    allowed = branch === main || matches(branch, cfg.allowed ?? ['feature/**','fix/**','chore/**']);
    reason = 'trunk policy';
  } else if (cfg.allowed?.length) {
    allowed = matches(branch, cfg.allowed) || branch === main;
    reason = 'custom allowed patterns';
  }

  return { allowed, strategy, reason };
}

export async function gitFlowStatus(repo: string, profile: Profile) {
  const cfg = flowConfig(profile);
  const branch = await currentBranch(repo);
  const branches = (await git(repo, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/']))
    .stdout.split(/\r?\n/).filter(Boolean);

  return {
    strategy: 'git-flow' as const,
    currentBranch: branch,
    classification: classify(branch, cfg),
    main: cfg.main,
    develop: cfg.develop,
    prefixes: {
      feature: cfg.featurePrefix,
      release: cfg.releasePrefix,
      hotfix: cfg.hotfixPrefix
    },
    branches,
    clean: await isClean(repo)
  };
}

export async function gitFlowStart(repo: string, kind: GitFlowKind, name: string, profile: Profile) {
  assertFlowPermission(profile);
  await ensureClean(repo);
  const cfg = flowConfig(profile);
  const value = normalizeName(name);

  if (kind === 'release' && !isSemVer(value)) {
    throw new Error(`Release names must be SemVer versions, e.g. 1.2.0. Received '${value}'.`);
  }

  const prefix = kind === 'feature' ? cfg.featurePrefix : kind === 'release' ? cfg.releasePrefix : cfg.hotfixPrefix;
  const base = kind === 'hotfix' ? cfg.main : cfg.develop;
  const branch = `${prefix}${value}`;

  if (!(await branchExists(repo, base))) throw new Error(`Required Git Flow base branch '${base}' does not exist.`);
  if (await branchExists(repo, branch)) throw new Error(`Branch '${branch}' already exists.`);

  await checkout(repo, base);
  await git(repo, ['checkout', '-b', branch]);

  return {
    success: true,
    action: 'start' as const,
    kind,
    branch,
    base,
    currentBranch: branch,
    event: `${kind}-start` as const
  };
}

export async function gitFlowFinish(
  repo: string,
  kind: GitFlowKind,
  name: string,
  profile: Profile,
  config: HeadbangConfig,
  options: GitFlowOptions = {}
) {
  assertFlowPermission(profile);
  await ensureClean(repo);
  const cfg = flowConfig(profile);
  const value = normalizeName(name);

  if (kind === 'release' && !isSemVer(value)) {
    throw new Error(`Release names must be SemVer versions, e.g. 1.2.0. Received '${value}'.`);
  }

  const prefix = kind === 'feature' ? cfg.featurePrefix : kind === 'release' ? cfg.releasePrefix : cfg.hotfixPrefix;
  const branch = `${prefix}${value}`;
  if (!(await branchExists(repo, branch))) throw new Error(`Branch '${branch}' does not exist.`);

  const originalBranch = await currentBranch(repo);
  if (originalBranch !== branch) {
    throw new Error(`Finish '${branch}' while checked out on that branch. Current branch is '${originalBranch}'.`);
  }

  const reviewBase = kind === 'hotfix' ? cfg.main : cfg.develop;
  const reviewProfile: Profile = { ...profile, branch: { ...(profile.branch ?? {}), main: reviewBase } };
  const review = options.review === false ? undefined : await reviewRepo(repo, reviewProfile, config);
  const blockers = review?.findings.filter((finding) => ['critical', 'high'].includes(finding.severity)) ?? [];
  if (blockers.length) {
    throw new Error(`Git Flow finish blocked by review findings: ${blockers.map((finding) => finding.message).join('; ')}`);
  }

  const deleteBranch = options.deleteBranch !== false;
  const originalMain = await branchSha(repo, cfg.main);
  const originalDevelop = await branchSha(repo, cfg.develop);
  const merges: Array<{ from: string; to: string }> = [];
  let tag: string | null = null;
  let tagCreated = false;

  try {
    if (kind === 'feature') {
      await checkout(repo, cfg.develop);
      await mergeNoFf(repo, branch, `chore(flow): merge ${branch}`);
      merges.push({ from: branch, to: cfg.develop });
    } else if (kind === 'release') {
      tag = `${cfg.tagPrefix}${value.replace(/^v/, '')}`;
      if (await tagExists(repo, tag)) throw new Error(`Tag '${tag}' already exists.`);

      await checkout(repo, cfg.main);
      await mergeNoFf(repo, branch, `chore(release): merge ${branch}`);
      merges.push({ from: branch, to: cfg.main });

      await git(repo, ['tag', '-a', tag, '-m', `Release ${tag}`]);
      tagCreated = true;

      await checkout(repo, cfg.develop);
      await mergeNoFf(repo, branch, `chore(release): merge ${branch} back to ${cfg.develop}`);
      merges.push({ from: branch, to: cfg.develop });
    } else {
      tag = isSemVer(value) ? `${cfg.tagPrefix}${value.replace(/^v/, '')}` : null;
      if (tag && await tagExists(repo, tag)) throw new Error(`Tag '${tag}' already exists.`);

      await checkout(repo, cfg.main);
      await mergeNoFf(repo, branch, `fix(hotfix): merge ${branch}`);
      merges.push({ from: branch, to: cfg.main });

      if (tag) {
        await git(repo, ['tag', '-a', tag, '-m', `Hotfix ${tag}`]);
        tagCreated = true;
      }

      await checkout(repo, cfg.develop);
      await mergeNoFf(repo, branch, `fix(hotfix): merge ${branch} back to ${cfg.develop}`);
      merges.push({ from: branch, to: cfg.develop });
    }

    await maybeDelete(repo, branch, deleteBranch);

    return {
      success: true,
      action: 'finish' as const,
      kind,
      branch,
      merges,
      tag,
      deletedBranch: deleteBranch,
      currentBranch: await currentBranch(repo),
      sourceRef: kind === 'feature' ? cfg.develop : cfg.main,
      event: `${kind}-finish` as const,
      review: review ? { findings: review.findings, tasks: review.tasks } : null
    };
  } catch (error) {
    const mergeHead = (await git(repo, ['rev-parse', '-q', '--verify', 'MERGE_HEAD'], true)).exitCode === 0;
    if (mergeHead) await git(repo, ['merge', '--abort'], true);

    if (tagCreated && tag) await git(repo, ['tag', '-d', tag], true);
    await rollbackBranch(repo, cfg.main, originalMain);
    await rollbackBranch(repo, cfg.develop, originalDevelop);
    await checkout(repo, originalBranch);

    throw error;
  }
}
