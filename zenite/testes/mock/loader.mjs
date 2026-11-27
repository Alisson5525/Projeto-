// Resolve hook do Node: redireciona os módulos do jogo para os mocks de teste.
const MAPA = {
  '@minecraft/server': new URL('./minecraft-server.js', import.meta.url).href,
  '@minecraft/server-ui': new URL('./minecraft-server-ui.js', import.meta.url).href,
};
export async function resolve(especificador, contexto, proximo) {
  if (MAPA[especificador]) return { url: MAPA[especificador], shortCircuit: true };
  return proximo(especificador, contexto);
}
