const fs=require('fs'),path=require('path');
function strip(s){let o='',i=0,inS=false;while(i<s.length){const c=s[i];if(inS){o+=c;if(c==='\\'){o+=s[i+1];i+=2;continue}if(c==='"')inS=false;i++;continue}if(c==='"'){inS=true;o+=c;i++;continue}if(c==='/'&&s[i+1]==='/'){while(i<s.length&&s[i]!=='\n')i++;continue}if(c==='/'&&s[i+1]==='*'){i+=2;while(i<s.length&&!(s[i]==='*'&&s[i+1]==='/'))i++;i+=2;continue}o+=c;i++}return o}
function walk(d,a=[]){for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())walk(p,a);else a.push(p)}return a}
let bad=0,soft=0;for(const f of walk(process.argv[2])){if(!f.endsWith('.json'))continue;let s=fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');try{JSON.parse(s)}catch(e){try{JSON.parse(strip(s).replace(/,(\s*[}\]])/g,'$1'));soft++;console.log('SOFT',f,e.message.slice(0,80))}catch(e2){bad++;console.log('BAD',f,e2.message.slice(0,120))}}}
console.log('bad',bad,'soft',soft)
