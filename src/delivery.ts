import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { git, currentBranch, isClean, remoteUrl } from './git/git.js';
import { projectTree } from './projection.js';
import { scanFiles } from './safety/scanner.js';
import { detectProvider } from './providers.js';
import type { HeadbangConfig, Profile } from './types.js';
import { reviewRepo } from './review/reviewer.js';
import { runShell } from './utils/process.js';
import { assertDeliveryAllowed, deliveryAllowed, type DeliveryContext } from './delivery-policy.js';

function assertPermission(profile: Profile, key: keyof NonNullable<Profile['permissions']>, explicit = false) {
  const value = profile.permissions?.[key];
  if (value === false || (explicit && value !== true)) {
    throw new Error(`Profile does not permit '${key}'.${explicit ? ' Set it explicitly to true for this mutating operation.' : ''}`);
  }
}

async function tasks(repo: string, names: string[] | undefined, profile: Profile, config: HeadbangConfig) {
  const results: any[] = [];
  for (const name of names ?? []) {
    const def = profile.tasks?.[name] ?? config.tasks?.[name];
    if (!def) throw new Error(`Task '${name}' is not defined.`);
    const result = await runShell(def.command, {
      cwd: def.cwd ? join(repo, def.cwd) : repo,
      timeoutMs: def.timeoutMs ?? 120000
    });
    results.push({ name, ...result });
    if (result.exitCode !== 0) throw new Error(`Task '${name}' failed.\n${result.stderr || result.stdout}`);
  }
  return results;
}

function contextOrManual(context?: Partial<DeliveryContext>): DeliveryContext {
  const resolved: DeliveryContext = {
    event: context?.event ?? 'manual',
    tag: context?.tag ?? null
  };
  if (context?.sourceRef) resolved.sourceRef = context.sourceRef;
  return resolved;
}

async function resolveSource(repo: string, profile: Profile, context: DeliveryContext) {
  const ref = profile.sourceRef ?? context.sourceRef ?? 'HEAD';
  const commit = (await git(repo, ['rev-parse', '--verify', `${ref}^{commit}`])).stdout.trim();
  return { ref, commit };
}

export async function previewDelivery(
  repo: string,
  name: string,
  profile: Profile,
  config: HeadbangConfig,
  options: { context?: Partial<DeliveryContext> } = {}
) {
  assertPermission(profile, 'inspect');
  const context = contextOrManual(options.context);
  const policy = deliveryAllowed(profile, context);

  if (profile.projection && profile.history === 'preserve') {
    throw new Error('Projection with history=preserve is not supported. Use history=snapshot or remove projection rules.');
  }

  const clean = await isClean(repo);
  if (profile.requireClean && !clean) throw new Error('Profile requires a clean working tree.');

  const url = await remoteUrl(repo, profile.remote);
  const provider = profile.provider ?? detectProvider(url);
  const source = await resolveSource(repo, profile, context);
  const branch = await currentBranch(repo);
  const review = await reviewRepo(repo, profile, config, {
    headRef: source.ref,
    enforceBranchPolicy: source.ref === 'HEAD'
  });

  return {
    profile: name,
    remote: profile.remote,
    url,
    provider,
    source: source.commit,
    sourceRef: source.ref,
    branch,
    targetBranch: profile.targetBranch ?? branch,
    history: profile.history ?? (profile.projection ? 'snapshot' : 'preserve'),
    visibility: profile.visibility ?? 'private',
    projection: profile.projection ?? null,
    deliveryEvent: context.event,
    tag: context.tag ?? null,
    deliveryPolicy: policy,
    review
  };
}

export async function deliver(
  repo: string,
  name: string,
  profile: Profile,
  config: HeadbangConfig,
  options: { dryRun?: boolean; context?: Partial<DeliveryContext> } = {}
) {
  const dryRun = options.dryRun ?? false;
  if (!dryRun) assertPermission(profile, 'push', true);

  const context = contextOrManual(options.context);
  assertDeliveryAllowed(profile, context);

  const preview = await previewDelivery(
    repo,
    name,
    profile,
    config,
    { context }
  );
  const blockers = preview.review.findings.filter((finding: any) => ['critical', 'high'].includes(finding.severity));
  if (blockers.length) {
    throw new Error(`Delivery blocked by review findings: ${blockers.map((x: any) => x.message).join('; ')}`);
  }

  if (dryRun) return { ...preview, dryRun: true };

  await tasks(repo, profile.preDelivery, profile, config);
  const history = preview.history;

  if (history === 'preserve' && !profile.projection) {
    const result = await git(repo, ['push', profile.remote, `${preview.source}:refs/heads/${preview.targetBranch}`]);
    await tasks(repo, profile.postDelivery, profile, config);
    return { ...preview, success: true, mode: 'preserve', push: result.stdout || result.stderr };
  }

  const temp = await mkdtemp(join(tmpdir(), 'headbang-'));
  const sourceDir = join(temp, 'source');
  const out = join(temp, 'projection');

  try {
    await git(repo, ['worktree', 'add', '--detach', sourceDir, preview.source]);
    const projection = await projectTree(sourceDir, out, profile.projection);
    const findings = await scanFiles(out, projection.included, preview.visibility);
    const blocking = findings.filter((finding) => finding.severity === 'critical' || finding.severity === 'high');
    if (blocking.length) {
      throw new Error(`Safety scan blocked delivery:\n${blocking.map((f) => `${f.file ?? ''}:${f.line ?? ''} ${f.message}`).join('\n')}`);
    }

    await git(out, ['init']);
    await git(out, ['add', '-A']);
    await git(out, ['config', 'user.name', 'HEADBANG']);
    await git(out, ['config', 'user.email', 'headbang@localhost']);
    await git(out, ['commit', '-m', `chore(delivery): publish ${name} projection`]);
    await git(out, ['remote', 'add', 'target', preview.url]);

    const args = ['push', 'target', `HEAD:refs/heads/${preview.targetBranch}`];
    if (history === 'snapshot') {
      assertPermission(profile, 'forcePush', true);
      const remoteHead = (await git(out, ['ls-remote', 'target', `refs/heads/${preview.targetBranch}`], true))
        .stdout.trim().split(/\s+/)[0] ?? '';
      args.push(`--force-with-lease=refs/heads/${preview.targetBranch}:${remoteHead}`);
    }

    const pushed = await git(out, args);
    await tasks(repo, profile.postDelivery, profile, config);

    return {
      ...preview,
      success: true,
      mode: 'snapshot',
      filesIncluded: projection.included.length,
      filesExcluded: projection.excluded.length,
      safetyFindings: findings,
      push: pushed.stdout || pushed.stderr
    };
  } finally {
    await git(repo, ['worktree', 'remove', '--force', sourceDir], true);
    await rm(temp, { recursive: true, force: true });
  }
}
