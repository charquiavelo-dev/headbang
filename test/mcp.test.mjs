import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec=promisify(execFile);

test('real stdio MCP supports protocol-only discovery, resources, and confirmed mutation',async()=>{
  const base=await mkdtemp(join(tmpdir(),'headbang-mcp-')),repo=join(base,'repo');await mkdir(repo);await exec('git',['init','-b','main',repo]);await exec('git',['-C',repo,'config','user.name','Test']);await exec('git',['-C',repo,'config','user.email','test@example.com']);await writeFile(join(repo,'README.md'),'# mcp\n');
  const config={version:2,defaultProfile:'origin',profiles:{origin:{remote:'origin',permissions:{inspect:true,release:true,git:true},branch:{strategy:'trunk',main:'main'},release:{enabled:true}},flow:{remote:'origin',permissions:{flow:true},branch:{strategy:'git-flow',main:'main',develop:'develop'}}}};await writeFile(join(repo,'.headbang.json'),JSON.stringify(config,null,2));await exec('git',['-C',repo,'add','-A']);await exec('git',['-C',repo,'commit','-m','feat: initial']);
  const child=spawn(process.execPath,[join(process.cwd(),'dist','mcp.js')],{cwd:repo,stdio:['pipe','pipe','pipe'],windowsHide:true});let buffer='',stderr='';const pending=new Map();child.stderr.on('data',chunk=>stderr+=chunk);child.stdout.on('data',chunk=>{buffer+=chunk;for(;;){const at=buffer.indexOf('\n');if(at<0)break;const line=buffer.slice(0,at).trim();buffer=buffer.slice(at+1);if(!line)continue;let message;try{message=JSON.parse(line);}catch{for(const p of pending.values())p.reject(new Error(`Non-protocol stdout: ${line}`));continue;}if(message.id!==undefined&&pending.has(message.id)){pending.get(message.id).resolve(message);pending.delete(message.id);}}});let id=0;const request=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});child.stdin.write(`${JSON.stringify({jsonrpc:'2.0',id:requestId,method,params})}\n`);setTimeout(()=>{if(pending.delete(requestId))reject(new Error(`Timeout waiting for ${method}; stderr=${stderr}`));},5000);});
  try{
    const initialized=await request('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1.0.0'}});assert.equal(initialized.result.serverInfo.name,'headbang');child.stdin.write(`${JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized',params:{}})}\n`);
    const tools=await request('tools/list'),names=tools.result.tools.map(x=>x.name);assert.ok(names.includes('headbang_flow_init'));assert.ok(names.includes('headbang_package_publish'));assert.ok(names.includes('headbang_release_plan'));assert.ok(names.includes('headbang_repair'));assert.ok(names.includes('headbang_git'));
    const prompts=await request('prompts/list');assert.ok(prompts.result.prompts.some(x=>x.name==='headbang-code-review'));const resources=await request('resources/list');assert.ok(resources.result.resources.some(x=>x.uri==='headbang://status'));
    const called=await request('tools/call',{name:'headbang_status',arguments:{repo}}),envelope=JSON.parse(called.result.content[0].text);assert.equal(envelope.success,true);const resource=await request('resources/read',{uri:'headbang://status'});assert.equal(resource.result.contents[0].uri,'headbang://status');
    const gitPlanCall=await request('tools/call',{name:'headbang_git',arguments:{repo,args:['branch','mcp-created']}}),gitPlan=JSON.parse(gitPlanCall.result.content[0].text);assert.equal(gitPlan.status,'planned');await assert.rejects(exec('git',['-C',repo,'show-ref','--verify','refs/heads/mcp-created']));const gitCall=await request('tools/call',{name:'headbang_git',arguments:{repo,args:['branch','mcp-created'],dryRun:false,confirmation:gitPlan.planDigest}}),gitResult=JSON.parse(gitCall.result.content[0].text);assert.equal(gitResult.status,'completed');assert.ok((await exec('git',['-C',repo,'show-ref','--verify','refs/heads/mcp-created'])).stdout);
    const previewCall=await request('tools/call',{name:'headbang_flow_init',arguments:{repo,profile:'flow'}}),preview=JSON.parse(previewCall.result.content[0].text);assert.equal(preview.status,'planned');await assert.rejects(exec('git',['-C',repo,'show-ref','--verify','refs/heads/develop']));
    const mutationCall=await request('tools/call',{name:'headbang_flow_init',arguments:{repo,profile:'flow',dryRun:false,confirmation:preview.planDigest}}),mutation=JSON.parse(mutationCall.result.content[0].text);assert.equal(mutation.status,'completed');assert.ok((await exec('git',['-C',repo,'show-ref','--verify','refs/heads/develop'])).stdout);
    assert.equal(buffer.trim(),'');
  }finally{child.kill('SIGTERM');await new Promise(resolve=>child.once('close',resolve));await rm(base,{recursive:true,force:true});}
});
