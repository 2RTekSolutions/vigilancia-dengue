// Contas do simulador: previsão sazonal, faixa de risco, clima e tendência.
// Tudo puro: recebe semanas já recortadas e não mexe na página.

const DIA = 24 * 60 * 60 * 1000;

const soma = (valores) => valores.reduce((total, v) => total + v, 0);
const limitar = (valor, minimo, maximo) => Math.min(maximo, Math.max(minimo, valor));

export function percentil(valores, p) {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const posicao = (ordenados.length - 1) * p;
  const base = Math.floor(posicao);
  const resto = posicao - base;
  if (base + 1 >= ordenados.length) return ordenados[base];
  return ordenados[base] + resto * (ordenados[base + 1] - ordenados[base]);
}

export const mediana = (valores) => percentil(valores, 0.5);

// Semana epidemiológica de um domingo: o ano é o da quarta-feira da semana,
// e a SE 1 é a semana que contém a primeira quarta-feira de janeiro.
export function semanaEpidemiologica(domingo) {
  const quarta = new Date(domingo.getTime() + 3 * DIA);
  const ano = quarta.getUTCFullYear();
  const primeiroJan = Date.UTC(ano, 0, 1);
  const diaDaSemana = new Date(primeiroJan).getUTCDay();
  const primeiraQuarta = primeiroJan + ((3 - diaDaSemana + 7) % 7) * DIA;
  const inicio = primeiraQuarta - 3 * DIA;
  const se = Math.floor((domingo.getTime() - inicio) / (7 * DIA)) + 1;
  return { ano, se };
}

export function proximasSemanas(ultima, horizonte) {
  const inicio = new Date(`${ultima.data}T00:00:00Z`).getTime();
  const lista = [];
  for (let h = 1; h <= horizonte; h++) {
    const domingo = new Date(inicio + h * 7 * DIA);
    lista.push({ data: domingo.toISOString().slice(0, 10), ...semanaEpidemiologica(domingo) });
  }
  return lista;
}

function vizinhas(se) {
  return new Set([se === 1 ? 53 : se - 1, se, se === 53 ? 1 : se + 1]);
}

// Casos das SE s-1, s e s+1 em todos os anos antes de anoReferencia.
function valoresSazonais(semanas, se, anoReferencia) {
  const alvo = vizinhas(se);
  return semanas.filter((s) => s.ano < anoReferencia && alvo.has(s.se)).map((s) => s.casos);
}

// Projeção = nível das últimas 4 semanas x formato da mesma época nos anos anteriores.
// O formato (razão sazonal) é limitado entre metade e o dobro, para a conta não explodir
// nem desabar quando o ano atual foge do histórico (ex.: uma epidemia maior que todas).
export function preverSazonal(semanas, horizonte = 4) {
  if (semanas.length < 4) return null;
  const ultima = semanas.at(-1);
  const anosAnteriores = new Set(semanas.filter((s) => s.ano < ultima.ano).map((s) => s.ano));
  if (anosAnteriores.size < 2) return null;

  const recentes = semanas.slice(-4);
  const nivelRecente = soma(recentes.map((s) => s.casos)) / 4;
  const baseRecente =
    soma(recentes.map((s) => mediana(valoresSazonais(semanas, s.se, ultima.ano)) ?? 0)) / 4;
  const razao = (valor, minimo, maximo) => limitar(((valor ?? 0) + 1) / (baseRecente + 1), minimo, maximo);

  const projetadas = proximasSemanas(ultima, horizonte).map((alvo) => {
    const valores = valoresSazonais(semanas, alvo.se, ultima.ano);
    const valor = nivelRecente * razao(mediana(valores), 0.5, 2);
    return {
      ...alvo,
      valor,
      inferior: Math.min(valor, nivelRecente * razao(percentil(valores, 0.25), 0.25, 2)),
      superior: Math.max(valor, nivelRecente * razao(percentil(valores, 0.75), 0.5, 4)),
    };
  });
  return { nivelRecente, semanas: projetadas };
}

// Faixa do próprio município. Não é o critério do InfoDengue.
export function faixaRisco(semanas) {
  const casos = semanas.map((s) => s.casos);
  return { p50: percentil(casos, 0.5), p75: percentil(casos, 0.75), p90: percentil(casos, 0.9) };
}

export function nivelPorCasos(valor, faixa) {
  if (valor <= faixa.p50) return 1;
  if (valor <= faixa.p75) return 2;
  if (valor <= faixa.p90) return 3;
  return 4;
}

// Uma bolha por semana do ano: clima médio e maior nº de casos que a semana já teve.
export function climaPorSemana(semanas) {
  const grupos = new Map();
  for (const s of semanas) {
    if (s.temp === null || s.temp === undefined || s.umid === null || s.umid === undefined) continue;
    const g = grupos.get(s.se) ?? { se: s.se, temps: [], umids: [], casos: 0 };
    g.temps.push(s.temp);
    g.umids.push(s.umid);
    g.casos = Math.max(g.casos, s.casos);
    grupos.set(s.se, g);
  }
  return [...grupos.values()]
    .sort((a, b) => a.se - b.se)
    .map((g) => ({ se: g.se, x: soma(g.umids) / g.umids.length, y: soma(g.temps) / g.temps.length, casos: g.casos }));
}

export function tendencia(semanas) {
  const atual = soma(semanas.slice(-4).map((s) => s.casos));
  if (semanas.length < 8) return { atual, anterior: null, variacao: null };
  const anterior = soma(semanas.slice(-8, -4).map((s) => s.casos));
  return { atual, anterior, variacao: anterior === 0 ? null : (atual - anterior) / anterior };
}
