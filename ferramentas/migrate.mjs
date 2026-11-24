import fs from "fs"; import path from "path";
const root = process.argv[2];
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.name.endsWith(".js")?[path.join(d,e.name)]:[])}
function matchParen(s,i){ // s[i]=='('
  let depth=0; let j=i;
  while(j<s.length){
    const c=s[j];
    if(c=='"'||c=="'"){const q=c;j++;while(s[j]!=q){if(s[j]=='\\')j++;j++}}
    else if(c=='`'){j++;while(s[j]!='`'){if(s[j]=='\\')j++; else if(s[j]=='$'&&s[j+1]=='{'){j=matchBrace(s,j+1);} j++}}
    else if(c=='(')depth++;
    else if(c==')'){depth--; if(depth==0)return j;}
    j++;
  }
  throw new Error("unbalanced");
}
function matchBrace(s,i){let depth=0;let j=i;while(j<s.length){const c=s[j];if(c=='"'||c=="'"){const q=c;j++;while(s[j]!=q){if(s[j]=='\\')j++;j++}}else if(c=='`'){j++;while(s[j]!='`'){if(s[j]=='\\')j++;else if(s[j]=='$'&&s[j+1]=='{'){j=matchBrace(s,j+1);}j++}}else if(c=='{')depth++;else if(c=='}'){depth--;if(depth==0)return j;}j++;}throw new Error("unbalanced brace")}
function recvStart(s,end){ // end = index of '.' before runCommandAsync (exclusive end of receiver)
  let j=end-1;
  while(j>=0){
    const c=s[j];
    if(/[\w$]/.test(c)){j--;continue}
    if(c=='.'){j--; if(s[j]=='?')j--; continue}
    if(c=='?' && s[j+1]=='.'){j--;continue}
    if(c==')'||c==']'){ // walk back balanced
      const open=c==')'?'(':'['; let depth=0;
      while(j>=0){ if(s[j]==c)depth++; else if(s[j]==open){depth--; if(depth==0)break;} j--; }
      j--; continue;
    }
    break;
  }
  return j+1;
}
let total=0;
for(const f of walk(root)){
  if(f.endsWith(path.join("lib","cmd.js"))) continue;
  let s=fs.readFileSync(f,"utf8"); const orig=s; let n=0;
  s=s.replace(/\.isValid\(\)/g,".isValid");
  let idx;
  while((idx=s.search(/\??\.runCommandAsync\(/))>=0){
    const dot=idx; const open=s.indexOf("(",idx);
    const close=matchParen(s,open);
    const args=s.slice(open+1,close);
    const st=recvStart(s,dot);
    const recv=s.slice(st,dot);
    let after=close+1;
    const tail=s.slice(after).match(/^(\?\.catch\?\.\(\s*\(\s*\w*\s*\)\s*=>\s*\{\s*\}\s*\)|\.catch\(\s*\(\s*\w*\s*\)\s*=>\s*\{\s*\}\s*\))/);
    if(tail) after+=tail[0].length;
    s=s.slice(0,st)+`cmd(${recv}, ${args.trim()})`+s.slice(after);
    n++;
  }
  if(n>0 && !/import \{[^}]*\bcmd\b[^}]*\} from ["'][./]+lib\/cmd(\.js)?["']/.test(s)){
    const rel=path.relative(path.dirname(f),path.join(root,"lib","cmd.js")).replace(/\\/g,"/").replace(/\.js$/,"");
    const r=rel.startsWith(".")?rel:"./"+rel;
    // insert after first import line
    const m=s.match(/^import[^\n]*\n/m);
    const line=`import { cmd } from "${r}";\n`;
    s= m? s.slice(0,m.index+m[0].length)+line+s.slice(m.index+m[0].length) : line+s;
  }
  if(s!==orig){fs.writeFileSync(f,s); total+=n; console.log(path.relative(root,f), n);}
}
console.log("total",total);
