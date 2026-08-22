import { readFile } from 'node:fs/promises'; import { join } from 'node:path'; import type { Finding } from '../types.js';
const rules=[
 ['critical','secret','Private key block',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i],
 ['critical','secret','Likely GitHub token',/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/],
 ['critical','secret','Likely AWS access key',/\bAKIA[0-9A-Z]{16}\b/],
 ['high','secret','Sensitive assignment',/\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|database_url)\s*[:=]\s*["']?(?![)\]}](?=[)\]}?.;,:]))[^\s"']{6,}/i],
 ['medium','account-data','Account identity field',/\b(?:account_login|account_server|user_id)\b\s*[:=]/i]
] as const;
export async function scanFiles(root:string,files:string[],visibility='private'):Promise<Finding[]>{ const out:Finding[]=[]; for(const file of files){ if(/(^|\/)\.env(?:\.|$)/i.test(file)&&!file.endsWith('.env.example')) out.push({severity:'critical',category:'secret',file,message:'.env file is included in delivery'}); let txt=''; try{txt=await readFile(join(root,file),'utf8')}catch{continue} const lines=txt.split(/\r?\n/); lines.forEach((line,i)=>{for(const [severity,category,message,re] of rules){if(re.test(line)) out.push({severity:visibility==='public'?severity:(severity==='critical'?'high':severity),category,file,line:i+1,message})}}); } return out; }
