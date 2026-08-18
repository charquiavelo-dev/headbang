import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('package is publishable and Apache-2.0', async () => {
  const p = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(p.name, 'headbang-mcp');
  assert.equal(p.version, '1.1.3');
  assert.equal(p.license, 'Apache-2.0');
  assert.equal(p.private, undefined);
  assert.equal(p.bin.headbang, 'dist/cli.js');
});

test('example includes Git Flow plus daily and stable delivery policies', async () => {
  const c = JSON.parse(await readFile(new URL('../examples/basic.headbang.json', import.meta.url), 'utf8'));
  assert.equal(c.profiles['codeberg-private'].permissions.flow, true);
  assert.equal(c.profiles['codeberg-private'].sourceRef, 'develop');
  assert.deepEqual(c.profiles['codeberg-stable'].delivery.autoOn, ['release-finish', 'hotfix-finish']);
  assert.equal(c.profiles['codeberg-stable'].delivery.requireTag, true);
  assert.ok(c.profiles['github-public']);
  assert.ok(c.profiles['gitlab-backend']);
});

test('CLI keeps JSON opt-in and renders human output', async () => {
  const cli = await readFile(new URL('../src/cli.ts', import.meta.url), 'utf8');
  assert.match(cli, /renderStatus/);
  assert.match(cli, /renderPushAll/);
  assert.match(cli, /if \(json\) console\.log\(JSON\.stringify/);
});

test('push --all refuses a misleading empty profile set', async () => {
  const cli = await readFile(new URL('../src/cli.ts', import.meta.url), 'utf8');
  assert.match(cli, /No HEADBANG delivery profiles are configured/);
  assert.match(cli, /Git remotes are not automatically treated as delivery profiles/);
});
