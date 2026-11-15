// Redireciona os módulos do Minecraft para as simulações.
export async function resolve(spec, ctx, next) {
  if (spec === "@minecraft/server") return { url: new URL("./mock_server.mjs", import.meta.url).href, shortCircuit: true };
  if (spec === "@minecraft/server-ui") return { url: new URL("./mock_ui.mjs", import.meta.url).href, shortCircuit: true };
  return next(spec, ctx);
}
