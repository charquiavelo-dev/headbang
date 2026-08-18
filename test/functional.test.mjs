import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { validateCommitMessage } from '../dist/review/conventional.js';
import { recommendBump } from '../dist/release/semver-lite.js';
import { matches } from '../dist/config/glob.js';
import { deliver } from '../dist/delivery.js';
const exec = promisify(execFile);
async function git(cwd,...args){ return exec('git',['-C',cwd,...args]); }

test('Conventional Commits and SemVer-lite',()=>{
  assert.equal(validateCommitMessage('fix(risk): preserve floor').valid,true);
  assert.equal(validateCommitMessage('fixed things').valid,false);
  assert.equal(recommendBump(['fix(api): bug']).bump,'patch');
  assert.equal(recommendBump(['feat(api): endpoint']).bump,'minor');
  assert.equal(recommendBump(['feat(api)!: replace contract']).bump,'major');
});

test('glob matcher supports projection-style patterns',()=>{
  assert.equal(matches('backend/src/a.ts',['backend/**']),true);
  assert.equal(matches('docs/internal/a.md',['docs/**']),true);
  assert.equal(matches('src/a.ts',['docs/**']),false);
});

test('snapshot delivery projects files and leaves source branch untouched', async()=>{
  const base=await mkdtemp(join(tmpdir(),'headbang-test-'));
  const repo=join(base,'repo'), bare=join(base,'remote.git'), clone=join(base,'clone');
  try{
    await mkdir(join(repo,'backend','src'),{recursive:true});
    await mkdir(join(repo,'docs','internal'),{recursive:true});
    await writeFile(join(repo,'backend','package.json'),'{}');
    await writeFile(join(repo,'backend','src','api.js'),'export const ok = true;\n');
    await writeFile(join(repo,'docs','internal','secret-not-a-secret.md'),'internal notes\n');
    await exec('git',['init','--bare',bare]);
    await exec('git',['init','-b','main',repo]);
    await git(repo,'config','user.name','Test'); await git(repo,'config','user.email','test@example.com');
    await git(repo,'add','-A'); await git(repo,'commit','-m','feat(api): initial backend');
    await git(repo,'remote','add','publish',bare);
    const profile={remote:'publish',targetBranch:'main',visibility:'private',history:'snapshot',permissions:{inspect:true,review:true,push:true,forcePush:true},projection:{include:['backend/**'],map:[{from:'backend',to:''}]}};
    const config={version:1,profiles:{publish:profile}};
    const result=await deliver(repo,'publish',profile,config);
    assert.equal(result.success,true); assert.equal(result.filesIncluded,2);
    assert.equal((await git(repo,'branch','--show-current')).stdout.trim(),'main');
    await exec('git',['clone','--branch','main',bare,clone]);
    assert.equal((await readFile(join(clone,'src','api.js'),'utf8')).trim(),'export const ok = true;');
    assert.equal((await readFile(join(clone,'package.json'),'utf8')).trim(),'{}');
    await assert.rejects(readFile(join(clone,'docs','internal','secret-not-a-secret.md'),'utf8'));
  } finally { await rm(base,{recursive:true,force:true}); }
});
