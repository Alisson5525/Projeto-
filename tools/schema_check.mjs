// Validate add-on JSON against the community Bedrock schemas (Blockception).
// usage: node schema_check.mjs <schemas dir> <addon dir>
import Ajv from "ajv";
import fs from "node:fs";
import path from "node:path";

const [schemasDir, addon] = process.argv.slice(2);
const strip = (t) => t.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, s) => s ?? "");
const MAP = [
  ["behavior_pack/blocks", "behavior/blocks/blocks.json"],
  ["behavior_pack/items", "behavior/items/items.json"],
  ["behavior_pack/recipes", "behavior/recipes/recipes.json"],
  ["behavior_pack/loot_tables", "behavior/loot_tables/loot_tables.json"],
  ["behavior_pack/spawn_rules", "behavior/spawn_rules/spawn_rules.json"],
  ["behavior_pack/entities", "behavior/entities/entities.json"],
  ["behavior_pack/feature_rules", "behavior/feature_rules/feature_rules.json"],
  ["resource_pack/attachables", "resource/attachables/attachables.json"],
  ["resource_pack/particles", "resource/particles/particles.json"],
  ["resource_pack/animations", "resource/animations/actor_animation.json"],
  ["resource_pack/fogs", "resource/fog/fog.json"],
];
let total = 0, bad = 0;
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".json") ? [path.join(d, e.name)] : []) : [];
for (const [folder, schemaRel] of MAP) {
  const sp = path.join(schemasDir, schemaRel);
  if (!fs.existsSync(sp)) { console.log("no schema", schemaRel); continue; }
  const ajv = new Ajv({ allErrors: false, strict: false, validateFormats: false });
  const validate = ajv.compile(JSON.parse(fs.readFileSync(sp, "utf8")));
  for (const f of walk(path.join(addon, folder))) {
    total++;
    const data = JSON.parse(strip(fs.readFileSync(f, "utf8").replace(/^\uFEFF/, "")));
    if (!validate(data)) {
      bad++;
      const errs = validate.errors.slice(0, 3).map((e) => `${e.instancePath} ${e.message}${e.params?.additionalProperty ? " (" + e.params.additionalProperty + ")" : ""}`);
      console.log("SCHEMA", path.relative(addon, f), "->", errs.join(" | "));
    }
  }
}
console.log(`${total} files checked against schemas, ${bad} with problems`);
