import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { validateCommitMessage } from '../dist/review/conventional.js';
import { recommendBump } from '../dist/release/semver-lite.js';
import { matches } from '../dist/config/glob.js';
import { deliver } from '../dist/delivery.js';
import { deliveryAllowed } from '../dist/delivery-policy.js';
import { finishFlow, startFlow } from '../dist/flow-orchestrator.js';

const exec = promisify(execFile);

async function git(cwd, ...args) {
  return exec('git', ['-C', cwd, ...args]);
}

async function initFlowRepo(base) {
  const repo = join(base, 'repo');
  await mkdir(repo, { recursive: true });
  await exec('git', ['init', '-b', 'main', repo]);
  await git(repo, 'config', 'user.name', 'Test');
  await git(repo, 'config', 'user.email', 'test@example.com');
  await writeFile(join(repo, 'README.md'), '# test\n');
  await git(repo, 'add', '-A');
  await git(repo, 'commit', '-m', 'feat: initial');
  await git(repo, 'branch', 'develop');
  return repo;
}

const flowProfile = {
  remote: 'origin',
  permissions: { inspect: true, review: true, push: true, flow: true },
  branch: { strategy: 'git-flow', main: 'main', develop: 'develop' },
  release: { tagPrefix: 'v' }
};

test('Conventional Commits and SemVer-lite', () => {
  assert.equal(validateCommitMessage('fix(risk): preserve floor').valid, true);
  assert.equal(validateCommitMessage('fixed things').valid, false);
  assert.equal(recommendBump(['fix(api): bug']).bump, 'patch');
  assert.equal(recommendBump(['feat(api): endpoint']).bump, 'minor');
  assert.equal(recommendBump(['feat(api)!: replace contract']).bump, 'major');
});

test('glob matcher supports projection-style patterns', () => {
  assert.equal(matches('backend/src/a.ts', ['backend/**']), true);
  assert.equal(matches('docs/internal/a.md', ['docs/**']), true);
  assert.equal(matches('src/a.ts', ['docs/**']), false);
});

test('delivery event policy blocks manual stable delivery', () => {
  const profile = {
    remote: 'origin',
    delivery: {
      allowOn: ['release-finish', 'hotfix-finish'],
      autoOn: ['release-finish', 'hotfix-finish'],
      requireTag: true
    }
  };
  assert.equal(deliveryAllowed(profile, { event: 'manual', tag: null }).allowed, false);
  assert.equal(deliveryAllowed(profile, { event: 'release-finish', tag: 'v1.1.0' }).allowed, true);
  assert.equal(deliveryAllowed(profile, { event: 'release-finish', tag: null }).allowed, false);
});

test('snapshot delivery projects files and leaves source branch untouched', async () => {
  const base = await mkdtemp(join(tmpdir(), 'headbang-test-'));
  const repo = join(base, 'repo');
  const bare = join(base, 'remote.git');
  const clone = join(base, 'clone');

  try {
    await mkdir(join(repo, 'backend', 'src'), { recursive: true });
    await mkdir(join(repo, 'docs', 'internal'), { recursive: true });
    await writeFile(join(repo, 'backend', 'package.json'), '{}');
    await writeFile(join(repo, 'backend', 'src', 'api.js'), 'export const ok = true;\n');
    await writeFile(join(repo, 'docs', 'internal', 'secret-not-a-secret.md'), 'internal notes\n');

    await exec('git', ['init', '--bare', bare]);
    await exec('git', ['init', '-b', 'main', repo]);
    await git(repo, 'config', 'user.name', 'Test');
    await git(repo, 'config', 'user.email', 'test@example.com');
    await git(repo, 'add', '-A');
    await git(repo, 'commit', '-m', 'feat(api): initial backend');
    await git(repo, 'remote', 'add', 'publish', bare);

    const profile = {
      remote: 'publish',
      targetBranch: 'main',
      visibility: 'private',
      history: 'snapshot',
      permissions: { inspect: true, review: true, push: true, forcePush: true },
      projection: { include: ['backend/**'], map: [{ from: 'backend', to: '' }] }
    };
    const config = { version: 1, profiles: { publish: profile } };
    const result = await deliver(repo, 'publish', profile, config);

    assert.equal(result.success, true);
    assert.equal(result.filesIncluded, 2);
    assert.equal((await git(repo, 'branch', '--show-current')).stdout.trim(), 'main');

    await exec('git', ['clone', '--branch', 'main', bare, clone]);
    assert.equal((await readFile(join(clone, 'src', 'api.js'), 'utf8')).trim(), 'export const ok = true;');
    assert.equal((await readFile(join(clone, 'package.json'), 'utf8')).trim(), '{}');
    await assert.rejects(readFile(join(clone, 'docs', 'internal', 'secret-not-a-secret.md'), 'utf8'));
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test('native Git Flow feature start and finish merges into develop', async () => {
  const base = await mkdtemp(join(tmpdir(), 'headbang-flow-feature-'));
  try {
    const repo = await initFlowRepo(base);
    await git(repo, 'remote', 'add', 'origin', join(base, 'unused.git'));
    const config = { version: 1, defaultProfile: 'flow', profiles: { flow: flowProfile } };

    const started = await startFlow(repo, 'feature', 'order-flow', flowProfile, config);
    assert.equal(started.branch, 'feature/order-flow');
    assert.equal((await git(repo, 'branch', '--show-current')).stdout.trim(), 'feature/order-flow');

    await writeFile(join(repo, 'feature.txt'), 'done\n');
    await git(repo, 'add', '-A');
    await git(repo, 'commit', '-m', 'feat(flow): add order flow');

    const finished = await finishFlow(repo, 'feature', 'order-flow', flowProfile, config);
    assert.equal(finished.currentBranch, 'develop');
    assert.equal(finished.tag, null);
    assert.equal((await git(repo, 'show-ref', '--verify', '--quiet', 'refs/heads/feature/order-flow').catch(() => ({ stdout: '' }))).stdout ?? '', '');
    assert.equal((await readFile(join(repo, 'feature.txt'), 'utf8')).trim(), 'done');
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test('release finish tags main, merges back, and auto-delivers stable branch only', async () => {
  const base = await mkdtemp(join(tmpdir(), 'headbang-flow-release-'));
  const bare = join(base, 'mirror.git');
  const clone = join(base, 'stable-clone');

  try {
    const repo = await initFlowRepo(base);
    await exec('git', ['init', '--bare', bare]);
    await git(repo, 'remote', 'add', 'origin', bare);

    const stable = {
      remote: 'origin',
      sourceRef: 'main',
      targetBranch: 'stable',
      history: 'preserve',
      permissions: { inspect: true, review: true, push: true },
      delivery: {
        allowOn: ['release-finish', 'hotfix-finish'],
        autoOn: ['release-finish', 'hotfix-finish'],
        requireTag: true
      }
    };

    const config = {
      version: 1,
      defaultProfile: 'flow',
      profiles: { flow: flowProfile, stable }
    };

    await assert.rejects(
      deliver(repo, 'stable', stable, config, { dryRun: true }),
      /not eligible for 'manual'/
    );

    await startFlow(repo, 'release', '1.1.0', flowProfile, config);
    await writeFile(join(repo, 'release.txt'), 'stable\n');
    await git(repo, 'add', '-A');
    await git(repo, 'commit', '-m', 'feat(release): stable capability');

    const finished = await finishFlow(repo, 'release', '1.1.0', flowProfile, config);
    assert.equal(finished.tag, 'v1.1.0');
    assert.equal(finished.currentBranch, 'develop');
    assert.equal(finished.deliveries.length, 1);
    assert.equal(finished.deliveries[0].profile, 'stable');

    const tag = (await git(repo, 'rev-parse', 'v1.1.0^{}')).stdout.trim();
    const main = (await git(repo, 'rev-parse', 'main')).stdout.trim();
    assert.equal(tag, main);

    await exec('git', ['clone', '--branch', 'stable', bare, clone]);
    assert.equal((await readFile(join(clone, 'release.txt'), 'utf8')).trim(), 'stable');
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test('same remote can receive develop daily while stable remains release-only', async () => {
  const base = await mkdtemp(join(tmpdir(), 'headbang-multi-branch-'));
  const bare = join(base, 'mirror.git');

  try {
    const repo = await initFlowRepo(base);
    await exec('git', ['init', '--bare', bare]);
    await git(repo, 'remote', 'add', 'origin', bare);

    const daily = {
      remote: 'origin',
      sourceRef: 'develop',
      targetBranch: 'daily',
      history: 'preserve',
      permissions: { inspect: true, review: true, push: true },
      delivery: {
        allowOn: ['manual', 'feature-finish', 'release-finish', 'hotfix-finish'],
        autoOn: ['feature-finish']
      }
    };
    const stable = {
      remote: 'origin',
      sourceRef: 'main',
      targetBranch: 'stable',
      history: 'preserve',
      permissions: { inspect: true, review: true, push: true },
      delivery: {
        allowOn: ['release-finish', 'hotfix-finish'],
        autoOn: ['release-finish', 'hotfix-finish'],
        requireTag: true
      }
    };
    const config = { version: 1, defaultProfile: 'flow', profiles: { flow: flowProfile, daily, stable } };

    await startFlow(repo, 'feature', 'daily-work', flowProfile, config);
    await writeFile(join(repo, 'daily.txt'), 'daily\n');
    await git(repo, 'add', '-A');
    await git(repo, 'commit', '-m', 'feat(daily): add work');
    const finished = await finishFlow(repo, 'feature', 'daily-work', flowProfile, config);

    assert.equal(finished.deliveries.length, 1);
    assert.equal(finished.deliveries[0].profile, 'daily');

    const remoteDaily = (await git(repo, 'ls-remote', 'origin', 'refs/heads/daily')).stdout.trim();
    const remoteStable = (await git(repo, 'ls-remote', 'origin', 'refs/heads/stable')).stdout.trim();
    assert.ok(remoteDaily);
    assert.equal(remoteStable, '');
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});


test('failed release merge rolls back local base branches and returns to release branch', async () => {
  const base = await mkdtemp(join(tmpdir(), 'headbang-flow-rollback-'));

  try {
    const repo = await initFlowRepo(base);
    await git(repo, 'remote', 'add', 'origin', join(base, 'unused.git'));
    const config = { version: 1, defaultProfile: 'flow', profiles: { flow: flowProfile } };

    await startFlow(repo, 'release', '1.2.0', flowProfile, config);
    await writeFile(join(repo, 'README.md'), '# release version\n');
    await git(repo, 'add', '-A');
    await git(repo, 'commit', '-m', 'feat(release): change readme');

    await git(repo, 'checkout', 'main');
    await writeFile(join(repo, 'README.md'), '# conflicting main version\n');
    await git(repo, 'add', '-A');
    await git(repo, 'commit', '-m', 'fix(main): conflicting readme');
    const mainBefore = (await git(repo, 'rev-parse', 'main')).stdout.trim();
    const developBefore = (await git(repo, 'rev-parse', 'develop')).stdout.trim();
    await git(repo, 'checkout', 'release/1.2.0');

    await assert.rejects(
      finishFlow(repo, 'release', '1.2.0', flowProfile, config),
      /CONFLICT|Automatic merge failed|failed/i
    );

    assert.equal((await git(repo, 'branch', '--show-current')).stdout.trim(), 'release/1.2.0');
    assert.equal((await git(repo, 'rev-parse', 'main')).stdout.trim(), mainBefore);
    assert.equal((await git(repo, 'rev-parse', 'develop')).stdout.trim(), developBefore);
    assert.equal((await git(repo, 'show-ref', '--verify', '--quiet', 'refs/tags/v1.2.0').then(() => 0).catch(() => 1)), 1);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});
