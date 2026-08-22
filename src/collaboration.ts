import { git, currentBranch, isClean, remoteUrl } from './git/git.js';
import type { HeadbangConfig, Profile } from './types.js';
import { branchProtection, createChangeRequest, inspectChangeRequest, listChangeRequestChecks, listChangeRequestReviewers, mergeChangeRequest, closeChangeRequest, publishReviewComment, repositoryCoordinates, ProviderHttpError } from './providers.js';
import { operation, requireConfirmation, planDigest } from './domain/operation.js';
import { withOperationLock } from './operations/journal.js';

type ChangeInput={title:string;body?:string|undefined;source?:string|undefined;target?:string|undefined;draft?:boolean|undefined};
function allowed(profile:Profile,key:'createPr'|'mergePr'|'publishReview'){if(profile.permissions?.[key]!==true)throw new Error(`Profile does not permit '${key}'. Set it explicitly to true.`);}
async function validBranch(repo:string,name:string){const result=await git(repo,['check-ref-format','--branch',name],true);if(result.exitCode!==0)throw new Error(`Invalid branch name '${name}'.`);}
async function localBranch(repo:string,name:string){return(await git(repo,['show-ref','--verify','--quiet',`refs/heads/${name}`],true)).exitCode===0;}
function enabled(profile:Profile){if(profile.changeRequest?.enabled!==true)throw new Error('Change requests are disabled for this profile.');}

export async function githubFlowStart(repo:string,name:string,profile:Profile){
  if(profile.branch?.strategy!=='github-flow')throw new Error('A github-flow profile is required.');if(profile.permissions?.flow!==true)throw new Error("Profile does not permit 'flow'.");if(!(await isClean(repo)))throw new Error('Working tree must be clean.');
  const main=profile.branch.main??'main';await validBranch(repo,name);if(!(await localBranch(repo,main)))throw new Error(`Required base branch '${main}' does not exist.`);if(await localBranch(repo,name))throw new Error(`Branch '${name}' already exists.`);await git(repo,['checkout',main]);await git(repo,['checkout','-b',name]);return operation({action:'start',strategy:'github-flow',branch:name,base:main});
}

export async function changeRequestPlan(repo:string,profile:Profile,input:ChangeInput){
  enabled(profile);allowed(profile,'createPr');const coordinates=repositoryCoordinates(await remoteUrl(repo,profile.remote),profile.provider);const source=input.source??await currentBranch(repo),target=input.target??profile.changeRequest!.target??profile.branch?.main??'main';await validBranch(repo,source);await validBranch(repo,target);if(!(await localBranch(repo,source)))throw new Error(`Source branch '${source}' does not exist locally.`);
  const sourceSha=(await git(repo,['rev-parse',source])).stdout.trim();let protection:unknown;try{protection=await branchProtection(coordinates,target);}catch(error){if(error instanceof ProviderHttpError&&error.status===404)protection={protected:false};else throw error;}const plan={coordinates,source,sourceSha,target,title:input.title,body:input.body??'',draft:input.draft??profile.changeRequest!.draft??false,protection};const digest=planDigest(plan);return operation(plan,'planned',{planDigest:digest,nextActions:[`Create change request with confirmation ${digest}`]});
}

export async function openChangeRequest(repo:string,profile:Profile,config:HeadbangConfig,input:ChangeInput&{confirmation?:string|undefined}){void config;const planned=await changeRequestPlan(repo,profile,input);requireConfirmation(planned.data,input.confirmation);return withOperationLock(repo,'change-request-create',async()=>{await git(repo,['push','-u',profile.remote,planned.data.source]);const data=await createChangeRequest(planned.data.coordinates,planned.data);return operation(data);});}

export async function changeRequestAction(repo:string,profile:Profile,id:number,action:'inspect'|'checks'|'reviewers'|'merge'|'close',confirmation?:string){
  enabled(profile);const coordinates=repositoryCoordinates(await remoteUrl(repo,profile.remote),profile.provider);if(action==='inspect')return operation(await inspectChangeRequest(coordinates,id));if(action==='checks')return operation(await listChangeRequestChecks(coordinates,id));if(action==='reviewers')return operation(await listChangeRequestReviewers(coordinates,id));allowed(profile,'mergePr');const existing:any=await inspectChangeRequest(coordinates,id);const source=existing.source_branch??existing.head?.ref??existing.source?.branch?.name;const target=existing.target_branch??existing.base?.ref??existing.destination?.branch?.name??profile.branch?.main??'main';const plan={action,id,provider:coordinates.provider,repo:`${coordinates.owner}/${coordinates.repo}`,strategy:profile.changeRequest?.mergeStrategy??'merge',source,target,deleteBranch:profile.changeRequest?.deleteBranch??false};requireConfirmation(plan,confirmation);
  return withOperationLock(repo,`change-request-${action}`,async()=>{const result=action==='merge'?await mergeChangeRequest(coordinates,id,plan.strategy):await closeChangeRequest(coordinates,id);if(action==='merge'&&plan.deleteBranch&&source){await git(repo,['push',profile.remote,'--delete',source]);if(await currentBranch(repo)===source)await git(repo,['checkout',target]);await git(repo,['branch','-d',source]);}return operation({result,cleanedBranch:action==='merge'&&plan.deleteBranch?source??null:null});});
}

export async function postReview(repo:string,profile:Profile,id:number,body:string,approved:boolean){enabled(profile);allowed(profile,'publishReview');const coordinates=repositoryCoordinates(await remoteUrl(repo,profile.remote),profile.provider);return operation(await publishReviewComment(coordinates,id,body,approved));}
