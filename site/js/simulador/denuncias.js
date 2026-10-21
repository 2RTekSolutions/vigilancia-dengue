// Denúncias SIMULADAS: geradas com semente para a demonstração ser reproduzível.

export const SITUACOES = ["nova", "agendada", "vistoriada"];

const TIPOS = [
  { nome: "Terreno baldio com lixo", peso: 2, chance: 0.25 },
  { nome: "Piscina abandonada", peso: 3, chance: 0.1 },
  { nome: "Pneus acumulados", peso: 3, chance: 0.15 },
  { nome: "Caixa d'água aberta", peso: 3, chance: 0.15 },
  { nome: "Entulho", peso: 1, chance: 0.15 },
  { nome: "Calha entupida", peso: 2, chance: 0.1 },
  { nome: "Imóvel fechado", peso: 2, chance: 0.1 },
];

export function mulberry32(semente) {
  let a = semente >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a do texto "geocode-ano-se".
export function semente(geocode, ano, se) {
  let hash = 0x811c9dc5;
  for (const caractere of `${geocode}-${ano}-${se}`) {
    hash ^= caractere.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function dentroDoAnel(lon, lat, anel) {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i];
    const [xj, yj] = anel[j];
    const cruza = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

function dentroDoPoligono(lon, lat, aneis) {
  const [externo, ...buracos] = aneis;
  return dentroDoAnel(lon, lat, externo) && !buracos.some((b) => dentroDoAnel(lon, lat, b));
}

export function dentroDoContorno(lon, lat, contorno) {
  return contorno.features.some(({ geometry }) => {
    if (geometry.type === "Polygon") return dentroDoPoligono(lon, lat, geometry.coordinates);
    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates.some((aneis) => dentroDoPoligono(lon, lat, aneis));
    }
    return false;
  });
}

// Grade 4x4: coluna A-D de oeste para leste, linha 1-4 de norte para sul.
export function setorDe(lat, lon, [sul, oeste, norte, leste]) {
  const coluna = Math.min(3, Math.floor(((lon - oeste) / (leste - oeste)) * 4));
  const linha = Math.min(3, Math.floor(((norte - lat) / (norte - sul)) * 4));
  return `${"ABCD"[coluna]}${linha + 1}`;
}

export function quantidadeDenuncias(casos) {
  return Math.min(60, 4 + Math.round(casos * 0.15));
}

function sortearTipo(valor) {
  let acumulado = 0;
  for (const tipo of TIPOS) {
    acumulado += tipo.chance;
    if (valor < acumulado) return tipo;
  }
  return TIPOS.at(-1);
}

export function contarAbertasPorSetor(lista) {
  const contagem = {};
  for (const d of lista) {
    if (d.situacao === "vistoriada") continue;
    contagem[d.setor] = (contagem[d.setor] ?? 0) + 1;
  }
  return contagem;
}

export function gerarDenuncias({ geocode, ano, se, casos, areaUrbana, contorno }) {
  const aleatorio = mulberry32(semente(geocode, ano, se));
  const [sul, oeste, norte, leste] = areaUrbana;
  const alvo = quantidadeDenuncias(casos);
  const lista = [];
  let tentativas = 0;
  while (lista.length < alvo && tentativas < alvo * 50) {
    tentativas++;
    const lat = sul + aleatorio() * (norte - sul);
    const lon = oeste + aleatorio() * (leste - oeste);
    if (!dentroDoContorno(lon, lat, contorno)) continue;
    const tipo = sortearTipo(aleatorio());
    const idadeDias = Math.floor(aleatorio() * 15);
    const sorteio = aleatorio();
    let situacao = "nova";
    if (idadeDias >= 10 && sorteio < 0.2) situacao = "vistoriada";
    else if (idadeDias >= 5 && sorteio < 0.6) situacao = "agendada";
    lista.push({
      id: lista.length + 1,
      lat,
      lon,
      tipo: tipo.nome,
      peso: tipo.peso,
      idadeDias,
      situacao,
      setor: setorDe(lat, lon, areaUrbana),
    });
  }
  const carga = contarAbertasPorSetor(lista);
  for (const d of lista) {
    d.prioridade = Math.round((d.peso + d.idadeDias / 7 + (carga[d.setor] ?? 0) / 2) * 10) / 10;
  }
  return ordenarFila(lista);
}

export function ordenarFila(lista) {
  return [...lista].sort((a, b) => {
    const aFechada = a.situacao === "vistoriada";
    const bFechada = b.situacao === "vistoriada";
    if (aFechada !== bFechada) return aFechada ? 1 : -1;
    return b.prioridade - a.prioridade || a.id - b.id;
  });
}

export function proximaSituacao(situacao) {
  const i = SITUACOES.indexOf(situacao);
  return SITUACOES[Math.min(i + 1, SITUACOES.length - 1)];
}
