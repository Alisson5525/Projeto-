// Extrai comandos de dentro dos scripts (literais passados a cmd(), listas de comandos dos modos)
import fs from "fs"; import path from "path";
const raiz = process.argv[2], saida = process.argv[3];
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.name.endsWith(".js")?[path.join(d,e.name)]:[])}
const CMD = /^\s*\/?(execute|scoreboard|tag|event|replaceitem|effect|give|clear|playsound|particle|tp|teleport|summon|function|camerashake|fog|title|titleraw|tellraw|hud|kill|setblock|fill|structure|spreadplayers|scriptevent|damage|ride|playanimation|gamerule|music|stopsound|xp|enchant|weather|time|say|me|inputpermission|camera|clone|gamemode|ability|testfor|testforblock|tickingarea|dialogue|loot|stopsound)\b/;
const linhas = [];
for (const f of walk(raiz)) {
  const s = fs.readFileSync(f, "utf8");
  const re = /(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g; let m;
  while ((m = re.exec(s))) {
    let t = m[2];
    if (!CMD.test(t)) continue;
    // substitui expressoes de template por valores plausiveis
    t = t.replace(/\$\{[^}]*\}/g, (x) => /tempo|dur|ticks|valor|v\b|n\b|tp|custo|qtd|Math|\.x|\.y|\.z|R|dist|pos|amp|i\b|s\b|alvo\.|tempo/.test(x) ? "1" : "x");
    t = t.replace(/\\"/g, '"').replace(/^\//, "");
    linhas.push(`# ${path.relative(raiz, f)}:${s.slice(0, m.index).split("\n").length}\n${t}`);
  }
}
fs.writeFileSync(saida, linhas.join("\n") + "\n");
console.log("comandos extraidos:", linhas.length);
