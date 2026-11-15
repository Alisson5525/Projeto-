// Raridade dos locais: influencia frequência, distância entre locais, complexidade e recompensa (XP, moedas, saque).
export const RARIDADE = {
  comum: { nome: "Comum", cor: "§f", ordem: 0, xp: 1, completo: { xp: 120, moedas: 15, fragmento: 0 } },
  incomum: { nome: "Incomum", cor: "§a", ordem: 1, xp: 1.4, completo: { xp: 260, moedas: 30, fragmento: 0.12 } },
  raro: { nome: "Raro", cor: "§9", ordem: 2, xp: 2, completo: { xp: 520, moedas: 70, fragmento: 0.3 } },
  lendario: { nome: "Lendário", cor: "§6", ordem: 3, xp: 3, completo: { xp: 1400, moedas: 180, fragmento: 0 } },
};

/** Raridade dos tipos originais (os tipos novos declaram `raridade` na própria definição). */
const LEGACY = {
  acampamento: "comum", vila: "comum", torre: "incomum", ninho_grifo: "incomum", cripta: "raro", kardum: "raro",
  ninho: "lendario", santuario: "lendario", capital: "lendario", aelthar: "lendario", nyxhal: "lendario", celeste: "lendario",
};

export function rarityOf(T) {
  if (!T) return RARIDADE.comum;
  return RARIDADE[T.raridade || LEGACY[T.id]] || RARIDADE.comum;
}
export function rarityId(T) {
  return T?.raridade || LEGACY[T?.id] || "comum";
}
export function rarityLabel(T) {
  const R = rarityOf(T);
  return `${R.cor}${R.nome}`;
}
