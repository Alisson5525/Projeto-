// Detecta identificadores locais que escondem (shadow) funcoes importadas, e chamadas de
// algo declarado como string/array. Usa a API do TypeScript.
import fs from "fs"; import path from "path";
import ts from "/tmp/claude-0/-home-user-Projeto-/1b8d153a-cfa2-5d5a-aa86-e63312848803/scratchpad/tools/node_modules/typescript/lib/typescript.js";
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.name.endsWith(".js")?[path.join(d,e.name)]:[])}
let n=0;
for (const f of walk(process.argv[2])) {
  const src = ts.createSourceFile(f, fs.readFileSync(f,"utf8"), ts.ScriptTarget.Latest, true);
  const importados = new Set();
  src.statements.forEach(st => { if (ts.isImportDeclaration(st) && st.importClause?.namedBindings && ts.isNamedImports(st.importClause.namedBindings)) st.importClause.namedBindings.elements.forEach(e => importados.add(e.name.text)); if (ts.isImportDeclaration(st) && st.importClause?.name) importados.add(st.importClause.name.text); });
  const topo = new Set();
  src.statements.forEach(st => { if (ts.isFunctionDeclaration(st) && st.name) topo.add(st.name.text); if (ts.isVariableStatement(st)) st.declarationList.declarations.forEach(d => ts.isIdentifier(d.name) && topo.add(d.name.text)); });
  function visit(node, profundidade) {
    const decl = (nome, no) => { if ((importados.has(nome) || topo.has(nome)) && profundidade > 0) { n++; console.log(`${path.relative(process.argv[2], f)}:${src.getLineAndCharacterOfPosition(no.pos).line + 1} '${nome}' esconde ${importados.has(nome) ? "import" : "funcao/variavel do modulo"}`); } };
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) && ts.isIdentifier(node.name)) decl(node.name.text, node);
    if (ts.isFunctionDeclaration(node) && node.name && profundidade > 0) decl(node.name.text, node);
    const nova = ts.isFunctionLike(node) || ts.isBlock(node) || ts.isForOfStatement(node) || ts.isForStatement(node) || ts.isForInStatement(node) || ts.isCatchClause(node) ? profundidade + 1 : profundidade;
    ts.forEachChild(node, c => visit(c, nova));
  }
  src.statements.forEach(st => visit(st, 0));
}
console.log("ocorrencias:", n);
