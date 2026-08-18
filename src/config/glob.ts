function escapeRe(s:string){return s.replace(/[|\\{}()[\]^$+?.]/g,'\\$&')}
export function globToRegExp(glob:string){ let g=glob.replace(/\\/g,'/'); let out='^'; for(let i=0;i<g.length;i++){ const ch=g[i]!; if(ch==='*'){ if(g[i+1]==='*'){i++; if(g[i+1]==='/'){i++;out+='(?:.*/)?'}else out+='.*'} else out+='[^/]*'; } else if(ch==='?') out+='[^/]'; else out+=escapeRe(ch); } return new RegExp(out+'$','i'); }
export function matches(path:string,patterns:string[]=[]){ const p=path.replace(/\\/g,'/'); return patterns.some(x=>globToRegExp(x).test(p)||globToRegExp(x.endsWith('/')?x+'**':x).test(p)); }
