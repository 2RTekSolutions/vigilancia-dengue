// Carga dos dados e recorte até a semana de referência.

export const NIVEIS = [
  null,
  { nome: "Baixo", cor: "#3a9a3f", texto: "#ffffff" },
  { nome: "Atenção", cor: "#d4a90e", texto: "#1f2937" },
  { nome: "Alerta", cor: "#e8650c", texto: "#ffffff" },
  { nome: "Crítico", cor: "#a8212b", texto: "#ffffff" },
];

export function chaveSE(ano, se) {
  return ano * 100 + se;
}

// Só as semanas até (ano, se), inclusive. Nenhum painel enxerga o futuro.
export function recortar(semanas, ano, se) {
  const limite = chaveSE(ano, se);
  return semanas.filter((s) => chaveSE(s.ano, s.se) <= limite);
}

export async function carregarJSON(caminho) {
  const resposta = await fetch(caminho);
  if (!resposta.ok) {
    throw new Error(`Falha ao carregar ${caminho}: HTTP ${resposta.status}`);
  }
  return resposta.json();
}

export function formatarData(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}
