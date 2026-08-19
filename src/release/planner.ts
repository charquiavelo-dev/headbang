import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { git, currentBranch, currentCommit, isClean } from '../git/git.js';
import type { HeadbangConfig, Profile } from '../types.js';
import { releaseInspect } from '../commands/release.js';
import { planPackagePublish } from '../packages/publisher.js';
import { operation, planDigest } from '../domain/operation.js';
import { monorepoReleasePlan } from '../monorepo.js';
import { compareVersions, parseVersion } from './semver-lite.js';

function prerelease(version:string){return parseVersion(version).prerelease.length>0;}
export async function releasePlan(repo:string,version:string,profileName:string,profile:Profile,config:HeadbangConfig){
  if(profile.release?.enabled!==true)throw new Error('Release execution is disabled for this profile.');
  if(profile.permissions?.release!==true)throw new Error("Profile does not permit 'release'. Set it explicitly to true.");
  if(profile.permissions?.push!==true)throw new Error("Profile does not permit 'push'. Set it explicitly to true for a release.");
  const packageJson=JSON.parse(await readFile(join(repo,'package.json'),'utf8').catch(()=>'{"version":"0.0.0"}'));
  const normalized=parseVersion(version).normalized,currentVersion=parseVersion(String(packageJson.version??'0.0.0')).normalized;
  if(compareVersions(normalized,currentVersion)<=0)throw new Error(`Release version ${normalized} must be newer than current version ${currentVersion}.`);
  const analysis=await releaseInspect(repo,currentVersion,profile.release?.rules??{});
  const main=profile.branch?.main??'main',develop=profile.branch?.develop??'develop',strategy=profile.branch?.strategy??'custom';
  if(strategy==='git-flow'&&main===develop)throw new Error('Git Flow main and develop branches must be different.');
  const remotes=Object.entries(config.profiles).filter(([,p])=>p.delivery?.autoOn?.includes('release-finish')).map(([name,p])=>({profile:name,remote:p.remote,target:p.targetBranch??main}));
  const versionFiles=profile.release.versionFiles??([{adapter:'package-json',path:'package.json'},{adapter:'package-json',path:'package-lock.json'}] as const);
  let monorepo:any=packageJson.workspaces?await monorepoReleasePlan(repo,normalized,(await git(repo,['rev-parse','HEAD~1'],true)).exitCode===0?'HEAD~1':'HEAD'):null,packagePlan:unknown=null;
  if(profile.packagePublish?.enabled){if(profile.permissions?.publishPackage!==true)throw new Error("Profile does not permit 'publishPackage'. Set it explicitly to true.");if(profile.packagePublish.workspaces&&monorepo){const packagePlans=[];for(const name of monorepo.order){const item=monorepo.releases.find((candidate:any)=>candidate.name===name);if(!item||item.private)continue;const workspaceProfile={...profile,packagePublish:{...profile.packagePublish,path:item.path,workspaces:false}};packagePlans.push((await planPackagePublish(repo,workspaceProfile,{versionOverride:item.nextVersion,sourceShaOverride:null})).data);}monorepo={...monorepo,packagePlans};}else packagePlan=(await planPackagePublish(repo,profile,{versionOverride:normalized,sourceShaOverride:null})).data;}
  const sourceSha=await currentCommit(repo),baseNames=[main,...(strategy==='git-flow'?[develop]:[])];
  const baseShas=Object.fromEntries(await Promise.all(baseNames.map(async name=>[name,(await git(repo,['rev-parse',name])).stdout.trim()])));
  const remote=profile.release.remote??profile.remote;
  const remoteShas=Object.fromEntries(await Promise.all(baseNames.map(async name=>{const result=await git(repo,['rev-parse',`refs/remotes/${remote}/${name}`],true);return[name,result.exitCode===0?result.stdout.trim():null];})));
  const remoteResult=await git(repo,['remote','get-url',remote],true);
  const remoteRepository=remoteResult.exitCode===0?remoteResult.stdout.trim():null;
  const hasPackages=Boolean(packagePlan||monorepo?.packagePlans?.length);const plan={profile:profileName,currentVersion,proposedVersion:normalized,recommendation:analysis.nextVersion,reasons:analysis.reasons,bump:analysis.bump,strategy,currentBranch:await currentBranch(repo),clean:await isClean(repo),sourceSha,baseShas,remoteShas,bases:{main,...(strategy==='git-flow'?{develop}:{})},merges:strategy==='git-flow'?[{from:`release/${normalized}`,to:main},{from:`release/${normalized}`,to:develop}]:[],tag:`${profile.release.tagPrefix??'v'}${normalized}`,prerelease:prerelease(normalized),versionFiles,qualityGates:profile.review?.tasks??[],blockOn:profile.review?.blockOn??['critical','high'],notes:profile.release.notes??{strategy:'headbang',changelog:'CHANGELOG.md'},remote,remoteRepository,atomicPush:profile.release.atomicPush??true,deliveries:remotes,providerRelease:profile.release.providerRelease??{enabled:false},packagePublish:packagePlan,monorepo,artifacts:profile.release.artifacts??{},permissionsRequired:['release','push',...(hasPackages?['publishPackage']:[])],potentiallyDestructive:['create release commit','create tag','push branches and tag',...(hasPackages?['publish package']:[])]};
  const digest=planDigest(plan);return operation(plan,'planned',{planDigest:digest,nextActions:[`Execute with confirmation ${digest}`]});
}
