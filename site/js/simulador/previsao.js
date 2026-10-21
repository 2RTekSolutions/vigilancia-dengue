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

function postos(valores) {
  const ordem = valores.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const resultado = new Array(valores.length);
  let i = 0;
  while (i < ordem.length) {
    let j = i;
    while (j + 1 < ordem.length && ordem[j + 1][0] === ordem[i][0]) j++;
    const posto = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) resultado[ordem[k][1]] = posto;
    i = j + 1;
  }
  return resultado;
}

function pearson(a, b) {
  const ma = soma(a) / a.length;
  const mb = soma(b) / b.length;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < a.length; i++) {
    cov += (a[i] - ma) * (b[i] - mb);
    va += (a[i] - ma) ** 2;
    vb += (b[i] - mb) ** 2;
  }
  if (va === 0 || vb === 0) return null;
  return cov / Math.sqrt(va * vb);
}

// Casos da semana t contra a temperatura da semana t - defasagem.
export function correlacaoDefasada(semanas, defasagem) {
  const pares = [];
  for (let i = defasagem; i < semanas.length; i++) {
    const temp = semanas[i - defasagem].temp;
    if (temp === null || temp === undefined) continue;
    pares.push({ x: temp, y: semanas[i].casos });
  }
  if (pares.length < 3) return { pares, rho: null };
  const rho = pearson(postos(pares.map((p) => p.x)), postos(pares.map((p) => p.y)));
  return { pares, rho: rho === null ? null : Math.round(rho * 100) / 100 };
}

export function tendencia(semanas) {
  const atual = soma(semanas.slice(-4).map((s) => s.casos));
  if (semanas.length < 8) return { atual, anterior: null, variacao: null };
  const anterior = soma(semanas.slice(-8, -4).map((s) => s.casos));
  return { atual, anterior, variacao: anterior === 0 ? null : (atual - anterior) / anterior };
}
