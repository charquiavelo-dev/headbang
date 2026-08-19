import { cp,lstat,mkdir,open,readdir } from 'node:fs/promises';
import { dirname,join,relative,sep } from 'node:path';
import type { Projection } from './types.js';
import { matches } from './config/glob.js';
import { resolveWithin } from './utils/path.js';

async function walk(root:string,dir=root,out:string[]=[]){for(const e of await readdir(dir,{withFileTypes:true})){if(e.name==='.git')continue;const full=join(dir,e.name);if(e.isDirectory()&&!e.isSymbolicLink())await walk(root,full,out);else out.push(relative(root,full).split(sep).join('/'));}return out;}
function selected(file:string,p?:Projection){if(!p)return true;const included=!p.include?.length||matches(file,p.include);const excluded=matches(file,p.exclude);return included&&!excluded;}
function mapped(file:string,p?:Projection){for(const m of p?.map??[]){const from=m.from.replace(/\\/g,'/').replace(/\/$/,'');if(file===from||file.startsWith(`${from}/`))return `${m.to.replace(/\\/g,'/').replace(/\/$/,'')}/${file.slice(from.length).replace(/^\//,'')}`.replace(/^\//,'');}return file;}
async function prefix(path:string,size=512){const handle=await open(path,'r');try{const buffer=Buffer.alloc(size),result=await handle.read(buffer,0,size,0);return buffer.subarray(0,result.bytesRead);}finally{await handle.close();}}

export async function projectTree(source:string,dest:string,p?:Projection){
  await mkdir(dest,{recursive:true});const all=await walk(source),chosen=all.filter(file=>selected(file,p)),excluded=all.filter(file=>!selected(file,p));
  if(chosen.includes('.gitmodules'))throw new Error('Projection contains Git submodules. Initialize and flatten them explicitly before delivery; HEADBANG will not publish an incomplete submodule tree.');
  if(p?.maxFiles&&chosen.length>p.maxFiles)throw new Error(`Projection contains ${chosen.length} selected files, exceeding maxFiles=${p.maxFiles}.`);
  const included:string[]=[],targets=new Map<string,string>();let bytes=0;
  for(const file of chosen){const src=resolveWithin(source,file,'projection source'),info=await lstat(src);if(p?.specialObjects==='block'&&info.isSymbolicLink())throw new Error(`Projection contains symlink '${file}'. Set specialObjects=preserve to allow it.`);if(!info.isSymbolicLink()){const sample=(await prefix(src)).toString('utf8').replace(/^\uFEFF/,'').trimStart();if(p?.specialObjects==='block'&&sample.startsWith('version https://git-lfs.github.com/spec/'))throw new Error(`Projection contains Git LFS pointer '${file}'.`);bytes+=info.size;if(p?.maxBytes&&bytes>p.maxBytes)throw new Error(`Projection exceeds maxBytes=${p.maxBytes}.`);}const target=mapped(file,p);const destination=resolveWithin(dest,target,'projection target');const normalized=relative(dest,destination).split(sep).join('/');const prior=targets.get(normalized.toLowerCase());if(prior)throw new Error(`Projection target collision: '${prior}' and '${file}' both map to '${normalized}'.`);targets.set(normalized.toLowerCase(),file);await mkdir(dirname(destination),{recursive:true});await cp(src,destination,{dereference:false});included.push(normalized);}
  return {included,excluded,bytes};
}
