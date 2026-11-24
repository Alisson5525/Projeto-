// lista chamadas a world.* / dimension / scoreboard executadas no escopo do modulo (fora de funcoes)
import fs from "fs"; import path from "path";
import ts from "/tmp/claude-0/-home-user-Projeto-/1b8d153a-cfa2-5d5a-aa86-e63312848803/scratchpad/tools/node_modules/typescript/lib/typescript.js";
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.name.endsWith(".js")?[path.join(d,e.name)]:[])}
for(const f of walk(process.argv[2])){
  const src=ts.createSourceFile(f,fs.readFileSync(f,"utf8"),ts.ScriptTarget.Latest,true);
  function visit(n,inFn){
    if(ts.isFunctionLike(n)) inFn=true;
    if(!inFn && ts.isCallExpression(n)){
      const t=n.expression.getText(src);
      if(/(^|\.)world\./.test(t) && !/\.subscribe$/.test(t)) console.log(path.relative(process.argv[2],f)+":"+(src.getLineAndCharacterOfPosition(n.pos).line+1),t);
    }
    if(!inFn && ts.isPropertyAccessExpression(n)){
      const t=n.getText(src);
      if(/^(mc\.)?world\.(scoreboard|getDimension|getPlayers|getDynamicProperty)/.test(t) && !ts.isCallExpression(n.parent)) console.log("PROP",path.relative(process.argv[2],f)+":"+(src.getLineAndCharacterOfPosition(n.pos).line+1),t);
    }
    ts.forEachChild(n,c=>visit(c,inFn));
  }
  visit(src,false);
}
