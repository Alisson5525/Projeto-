// Redireciona @minecraft/server e @minecraft/server-ui para os mocks do simulador.
import { register } from 'node:module';
register('./hooks.mjs', import.meta.url);
