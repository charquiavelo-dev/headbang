import { run } from '../utils/process.js';
export async function git(repo:string,args:string[],allowFailure=false){ const r=await run('git',['-C',repo,...args]); if(!allowFailure&&r.exitCode!==0) throw new Error(r.stderr||`git ${args.join(' ')} failed`); return r; }
export async function repoRoot(repo:string){ return (await git(repo,['rev-parse','--show-toplevel'])).stdout.trim(); }
export async function currentBranch(repo:string){ return (await git(repo,['branch','--show-current'])).stdout.trim(); }
export async function currentCommit(repo:string){ return (await git(repo,['rev-parse','HEAD'])).stdout.trim(); }
export async function isClean(repo:string){ return (await git(repo,['status','--porcelain'])).stdout.trim()===''; }
export async function remoteUrl(repo:string,remote:string){ return (await git(repo,['remote','get-url',remote])).stdout.trim(); }
export async function remotes(repo:string){ const r=await git(repo,['remote','-v']); return r.stdout.split(/\r?\n/).filter(Boolean); }
