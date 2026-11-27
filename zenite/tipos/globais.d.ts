// Globais que o runtime de scripts do Minecraft fornece e que o TypeScript
// não conhece sem a lib "dom". Usado só na checagem de tipos (não vai no pacote).
declare var console: {
  log(...dados: any[]): void;
  info(...dados: any[]): void;
  warn(...dados: any[]): void;
  error(...dados: any[]): void;
};
