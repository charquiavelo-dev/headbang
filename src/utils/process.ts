import { spawn } from 'node:child_process';
import type { CommandResult } from '../types.js';
export async function run(command:string,args:string[]=[],opts:{cwd?:string,timeoutMs?:number,env?:NodeJS.ProcessEnv}={}):Promise<CommandResult>{
  const started=Date.now();
  return await new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd:opts.cwd,env:{...process.env,...opts.env},shell:false,windowsHide:true});
    let stdout='',stderr=''; let killed=false;
    child.stdout?.on('data',d=>stdout+=d); child.stderr?.on('data',d=>stderr+=d);
    const timer=opts.timeoutMs?setTimeout(()=>{killed=true;child.kill('SIGTERM')},opts.timeoutMs):undefined;
    child.on('error',reject); child.on('close',code=>{if(timer)clearTimeout(timer); resolve({command:[command,...args].join(' '),exitCode:killed?124:(code??1),stdout:stdout.trimEnd(),stderr:stderr.trimEnd(),durationMs:Date.now()-started})});
  });
}
export async function runShell(command:string,opts:{cwd?:string,timeoutMs?:number}={}){ const shell=process.platform==='win32'?'cmd':'sh'; const args=process.platform==='win32'?['/d','/s','/c',command]:['-lc',command]; return run(shell,args,opts); }
