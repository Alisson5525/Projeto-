const MAP = {
  "@minecraft/server": new URL("./mock_server.mjs", import.meta.url).href,
  "@minecraft/server-ui": new URL("./mock_ui.mjs", import.meta.url).href,
};
export async function resolve(spec, ctx, next) {
  if (MAP[spec]) return { url: MAP[spec], shortCircuit: true };
  return next(spec, ctx);
}
