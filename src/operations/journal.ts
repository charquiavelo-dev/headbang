import { mkdir, open, readFile, readdir, rename, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { redact } from '../domain/operation.js';
import { assertOperationId } from '../utils/path.js';

export interface JournalStep { name: string; status: 'pending'|'completed'|'failed'|'skipped'; detail?: unknown; completedAt?: string }
export interface Journal { operationId: string; type: string; createdAt: string; updatedAt: string; status: 'in-progress'|'completed'|'partial'|'failed'; steps: JournalStep[]; context: unknown; nextActions: string[] }
const stateDir = (repo:string) => join(repo, '.headbang');
const journalPath = (repo:string,id:string) => join(stateDir(repo), 'operations', `${assertOperationId(id)}.json`);
const lockPath = (repo:string) => join(stateDir(repo), 'operation.lock');

export async function createJournal(repo:string,type:string,steps:string[],context:unknown,operationId=randomUUID()) {
  const now=new Date().toISOString(); const journal:Journal={operationId,type,createdAt:now,updatedAt:now,status:'in-progress',steps:steps.map(name=>({name,status:'pending'})),context:redact(context),nextActions:[]};
  await saveJournal(repo,journal); return journal;
}
export async function saveJournal(repo:string,journal:Journal){
  journal.updatedAt=new Date().toISOString();const path=journalPath(repo,journal.operationId);await mkdir(dirname(path),{recursive:true});
  const temporary=`${path}.${process.pid}.${randomUUID()}.tmp`;let handle;
  try{handle=await open(temporary,'wx');await handle.writeFile(`${JSON.stringify(redact(journal),null,2)}\n`,'utf8');await handle.sync();await handle.close();handle=undefined;await rename(temporary,path);}
  finally{if(handle)await handle.close().catch(()=>{});await rm(temporary,{force:true}).catch(()=>{});}
}
export async function loadJournal(repo:string,id:string){const journal=JSON.parse(await readFile(journalPath(repo,id),'utf8')) as Journal;Object.defineProperty(journal,'__repo',{value:repo,enumerable:false});return journal;}
export async function listJournals(repo:string){
  let files:string[];try{files=await readdir(join(stateDir(repo),'operations'));}catch(error:any){if(error?.code==='ENOENT')return [];throw error;}
  return Promise.all(files.filter(x=>x.endsWith('.json')).map(async x=>{try{return JSON.parse(await readFile(join(stateDir(repo),'operations',x),'utf8')) as Journal;}catch(error:any){throw new Error(`Cannot read operation journal '${x}': ${error?.message??error}`);}}));
}
export async function withOperationLock<T>(repo:string,type:string,fn:()=>Promise<T>):Promise<T>{
  await mkdir(stateDir(repo),{recursive:true}); const path=lockPath(repo); let handle;
  try{handle=await open(path,'wx');await handle.writeFile(JSON.stringify({pid:process.pid,type,createdAt:new Date().toISOString()}));}
  catch(error:any){if(error?.code==='EEXIST'){const raw=await readFile(path,'utf8').catch(()=>'{"owner":"unknown"}');throw new Error(`Another HEADBANG mutation holds ${path}: ${raw}`);}throw error;}
  try{return await fn();}finally{try{await handle?.close();}finally{await rm(path,{force:true});}}
}
export async function inspectRecovery(repo:string){
  const path=lockPath(repo);let lock:null|{path:string;ageMs:number;metadata:unknown;parseError?:string}=null;
  try{const info=await stat(path);const raw=await readFile(path,'utf8');try{lock={path,ageMs:Date.now()-info.mtimeMs,metadata:JSON.parse(raw)};}catch(error:any){lock={path,ageMs:Date.now()-info.mtimeMs,metadata:null,parseError:error?.message??String(error)};}}catch(error:any){if(error?.code!=='ENOENT')throw error;}
  const journals=await listJournals(repo);return{lock,incomplete:journals.filter(j=>j.status!=='completed')};
}
function processAlive(pid:unknown){if(!Number.isInteger(pid)||Number(pid)<=0)return false;try{process.kill(Number(pid),0);return true;}catch(error:any){return error?.code==='EPERM';}}
export async function repairRecovery(repo:string,authorized=false){if(!authorized)throw new Error("Repair requires permissions.repair=true and explicit confirmation.");const state=await inspectRecovery(repo);const stale=Boolean(state.lock&&state.lock.ageMs>3600000);const ownerAlive=state.lock?processAlive((state.lock.metadata as any)?.pid):false;if(stale&&!ownerAlive)await rm(state.lock!.path,{force:true});return{repairedStaleLock:stale&&!ownerAlive,ownerAlive,incomplete:state.incomplete.map(j=>j.operationId)};}
