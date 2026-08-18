import test from 'node:test';import assert from 'node:assert/strict';
// Source-level smoke tests intentionally avoid requiring a build before dependency installation.
import { readFile } from 'node:fs/promises';
test('package is publishable and Apache-2.0',async()=>{const p=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.equal(p.name,'headbang-mcp');assert.equal(p.license,'Apache-2.0');assert.equal(p.private,undefined);assert.equal(p.bin.headbang,'dist/cli.js')});
test('config example has three distinct delivery profiles',async()=>{const c=JSON.parse(await readFile(new URL('../examples/basic.headbang.json',import.meta.url),'utf8'));assert.ok(c.profiles['codeberg-private']);assert.ok(c.profiles['github-public']);assert.ok(c.profiles['gitlab-backend'])});
