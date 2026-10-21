# Simulador da vigilância — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `site/simulador.html` que mostra o sistema pronto na tela da Vigilância Epidemiológica, para Olímpia, Itanhaém e Viçosa, com casos e clima reais e previsão, denúncias e mapa simulados.

**Architecture:** Um módulo Python (`src/etl/exportar_simulador.py`) reaproveita o ETL e grava um JSON estático por município. O site é HTML + CSS + JS com módulos ES, sem build. As contas ficam em módulos puros (`dados.js`, `previsao.js`, `denuncias.js`), testados no Node. Os desenhos ficam em `graficos.js` (Chart.js) e `mapa.js` (Leaflet), e `main.js` guarda o estado e liga os painéis.

**Tech Stack:** Python 3.12 + pandas + requests (ETL existente), pytest; JS ES2022, Node 26 (`node --test`); Chart.js 4.4.1 e Leaflet 1.9.4 via CDN; tiles do OpenStreetMap.

**Spec:** `docs/superpowers/specs/2026-10-21-simulador-design.md`

## Global Constraints

- Municípios: Olímpia/SP 3533908, Itanhaém/SP 3522109, Viçosa/MG 3171303; histórico desde 2018.
- Faixa fixa na tela: "SIMULADOR: casos e clima reais (InfoDengue); previsão, denúncias e mapa são simulados."
- Nada do futuro vaza: todo painel usa só semanas até a semana de referência, inclusive.
- Previsão nunca é comparada com o que aconteceu depois.
- Denúncias com semente = hash(geocode, ano, SE), gerador mulberry32.
- Quantidade de denúncias = 4 + round(casos × 0,15), no máximo 60. Grade de setores 4×4.
- Nenhum dado individual de paciente. Nenhum nome de bairro inventado.
- JSON leva `"doenca": "dengue"`. `temp`, `umid` e `rt` podem ser `null`.
- Cores dos níveis (validadas com o validador do dataviz no modo claro): Baixo `#3a9a3f`, Atenção `#d4a90e`, Alerta `#e8650c`, Crítico `#a8212b`. Cor nunca sozinha: sempre com o nome do nível.
- Sem atribuição do Claude em commits e PRs. Mensagens de commit no padrão do repo (`feat:`, `test:`, `docs:`), em português, com `Refs #32`.
- Tema só claro, como os wireframes: `color-scheme: light` e fundo explícito no `body`.
- Ruff limpo (`uv run ruff check src tests`).

## Review Focus

1. **Semana de referência no começo do histórico** (primeiras semanas de 2018): cards, previsão e clima não quebram; a previsão diz "histórico insuficiente". Teste em `previsao.test.mjs` (`tendencia` com menos de 8 semanas; `preverSazonal` com 1 ano).
2. **Entressafra com zero casos recentes:** o ajuste cai para 0,25 e a previsão fica baixa, sem dividir por zero. Teste em `previsao.test.mjs`.
3. **Virada de ano na projeção** (SE 52 ou 53 → SE 1): os rótulos seguem o calendário epidemiológico real (2025 tem SE 53). Teste de `semanaEpidemiologica` e de `proximasSemanas`.
4. **Área urbana que não cruza o contorno, ou contorno com buraco ou MultiPolygon:** `gerarDenuncias` devolve menos pontos e não entra em laço infinito. Teste em `denuncias.test.mjs`.
5. **Semanas sem temperatura** (11 em Olímpia): a correlação pula a semana e o painel de clima não mostra NaN. Teste em `previsao.test.mjs`.

---

### Task 1: Exportar os JSON do simulador

**Files:**
- Create: `src/etl/exportar_simulador.py`
- Create: `tests/etl/test_exportar_simulador.py`
- Create (gerados): `site/dados/simulador/municipios.json`, `site/dados/simulador/3533908.json`, `site/dados/simulador/3522109.json`, `site/dados/simulador/3171303.json`

**Interfaces:**
- Consumes: `etl.extrair.extrair(geocode, ano_inicio, ano_fim, doenca="dengue") -> DataFrame` (colunas cruas do InfoDengue), `etl.transformar.transformar(df, geocode)`, `etl.transformar.validar(df)`.
- Produces: JSON por município com o formato do spec (`geocode, nome, uf, doenca, fonte, atualizado_em, populacao, area_urbana [sul, oeste, norte, leste], contorno, semanas[{data, ano, se, casos, temp, umid, rt, nivel}]`) e `municipios.json` = `[{geocode, nome, uf}]`.

- [ ] **Step 1: Write the failing test**

`tests/etl/test_exportar_simulador.py`:

```python
import json
from datetime import date

import numpy as np
import pandas as pd
import pytest

from etl import exportar_simulador

CONFIG = {
    "geocode": 3533908,
    "nome": "Olímpia",
    "uf": "SP",
    "area_urbana": [-20.76, -48.94, -20.715, -48.885],
}

CONTORNO = {"type": "FeatureCollection", "features": []}


def bruto_falso(*args, **kwargs):
    return pd.DataFrame(
        {
            "SE": [202403, 202402],
            "data_iniSE": ["2024-01-14", "2024-01-07"],
            "casos": [12, 10],
            "nivel": [2, 1],
            "tempmed": [26.123, np.nan],
            "umidmed": [70.0, 71.5],
            "Rt": [1.234, 0.9],
            "pop": [56037, 56037],
        }
    )


@pytest.fixture
def sem_rede(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(exportar_simulador, "extrair", bruto_falso)
    monkeypatch.setattr(
        exportar_simulador, "baixar_contorno", lambda geocode: CONTORNO
    )


def test_montar_municipio_ordena_e_troca_nan_por_none(sem_rede):
    dados = exportar_simulador.montar_municipio(CONFIG, 2024, date(2026, 10, 21))

    assert dados["geocode"] == 3533908
    assert dados["doenca"] == "dengue"
    assert dados["atualizado_em"] == "2026-10-21"
    assert dados["populacao"] == 56037
    assert dados["contorno"] == CONTORNO
    assert [s["se"] for s in dados["semanas"]] == [2, 3]
    primeira = dados["semanas"][0]
    assert primeira == {
        "data": "2024-01-07",
        "ano": 2024,
        "se": 2,
        "casos": 10,
        "temp": None,
        "umid": 71.5,
        "rt": 0.9,
        "nivel": 1,
    }
    assert dados["semanas"][1]["temp"] == 26.12


def test_exportar_grava_um_json_por_municipio_e_a_lista(sem_rede, tmp_path):
    caminhos = exportar_simulador.exportar(
        pasta=tmp_path, hoje=date(2026, 10, 21), municipios=[CONFIG]
    )

    assert caminhos == [tmp_path / "3533908.json"]
    lista = json.loads((tmp_path / "municipios.json").read_text(encoding="utf-8"))
    assert lista == [{"geocode": 3533908, "nome": "Olímpia", "uf": "SP"}]
    dados = json.loads(caminhos[0].read_text(encoding="utf-8"))
    assert dados["nome"] == "Olímpia"
    assert "NaN" not in caminhos[0].read_text(encoding="utf-8")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/etl/test_exportar_simulador.py -v`
Expected: FAIL com `ImportError: cannot import name 'exportar_simulador'`

- [ ] **Step 3: Write minimal implementation**

`src/etl/exportar_simulador.py`:

```python
"""Exporta os dados do simulador da vigilância para JSON estático.

Uso (na raiz do repositório):
    PYTHONPATH=src uv run python -m etl.exportar_simulador
"""

import json
import math
from datetime import date
from pathlib import Path

import requests

from etl.extrair import extrair
from etl.transformar import transformar, validar

ANO_INICIO = 2018
PASTA_SAIDA = Path("site/dados/simulador")
URL_MALHA = (
    "https://servicodados.ibge.gov.br/api/v3/malhas/municipios/{geocode}"
    "?formato=application/vnd.geo+json&qualidade=minima"
)

# area_urbana = [sul, oeste, norte, leste], onde caem as denúncias simuladas.
MUNICIPIOS = [
    {
        "geocode": 3533908,
        "nome": "Olímpia",
        "uf": "SP",
        "area_urbana": [-20.760, -48.940, -20.715, -48.885],
    },
    {
        "geocode": 3522109,
        "nome": "Itanhaém",
        "uf": "SP",
        "area_urbana": [-24.215, -46.840, -24.160, -46.740],
    },
    {
        "geocode": 3171303,
        "nome": "Viçosa",
        "uf": "MG",
        "area_urbana": [-20.775, -42.900, -20.735, -42.860],
    },
]


def baixar_contorno(geocode: int) -> dict:
    """Baixa o contorno do município (GeoJSON) da API de malhas do IBGE."""
    response = requests.get(URL_MALHA.format(geocode=geocode), timeout=30)
    response.raise_for_status()
    return response.json()


def _numero_ou_none(valor) -> float | None:
    if valor is None or math.isnan(valor):
        return None
    return round(float(valor), 2)


def montar_municipio(config: dict, ano_fim: int, hoje: date) -> dict:
    """Monta o dicionário de um município no formato do simulador."""
    geocode = config["geocode"]
    df = validar(transformar(extrair(geocode, ANO_INICIO, ano_fim), geocode))
    semanas = [
        {
            "data": linha.data_inicio_semana.strftime("%Y-%m-%d"),
            "ano": int(linha.ano),
            "se": int(linha.semana_epidemiologica),
            "casos": int(linha.casos_notificados),
            "temp": _numero_ou_none(linha.temperatura_media),
            "umid": _numero_ou_none(linha.umidade_media),
            "rt": _numero_ou_none(linha.taxa_reproducao_rt),
            "nivel": int(linha.nivel_alerta),
        }
        for linha in df.itertuples()
    ]
    return {
        "geocode": geocode,
        "nome": config["nome"],
        "uf": config["uf"],
        "doenca": "dengue",
        "fonte": "InfoDengue (Fiocruz/FGV)",
        "atualizado_em": hoje.isoformat(),
        "populacao": int(df["populacao"].iloc[-1]),
        "area_urbana": config["area_urbana"],
        "contorno": baixar_contorno(geocode),
        "semanas": semanas,
    }


def exportar(
    pasta: Path = PASTA_SAIDA,
    hoje: date | None = None,
    municipios: list[dict] | None = None,
) -> list[Path]:
    """Grava um JSON por município e a lista municipios.json."""
    hoje = hoje or date.today()
    municipios = municipios or MUNICIPIOS
    pasta.mkdir(parents=True, exist_ok=True)
    caminhos = []
    for config in municipios:
        dados = montar_municipio(config, hoje.year, hoje)
        caminho = pasta / f"{config['geocode']}.json"
        caminho.write_text(
            json.dumps(dados, ensure_ascii=False, allow_nan=False), encoding="utf-8"
        )
        caminhos.append(caminho)
    lista = [
        {"geocode": c["geocode"], "nome": c["nome"], "uf": c["uf"]} for c in municipios
    ]
    (pasta / "municipios.json").write_text(
        json.dumps(lista, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return caminhos


if __name__ == "__main__":
    for caminho in exportar():
        print(caminho)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/etl -v && uv run ruff check src tests`
Expected: todos os testes PASS (18 antigos + 2 novos); Ruff sem erros.

- [ ] **Step 5: Generate the real files**

Run: `PYTHONPATH=src uv run python -m etl.exportar_simulador && ls -la site/dados/simulador && python3 -c "import json;d=json.load(open('site/dados/simulador/3522109.json'));print(d['nome'],len(d['semanas']),d['semanas'][-1])"`
Expected: 4 arquivos; Itanhaém com cerca de 458 semanas, a última de 2026.

- [ ] **Step 6: Commit**

```bash
git add src/etl/exportar_simulador.py tests/etl/test_exportar_simulador.py site/dados/simulador
git commit -m "feat: exporta dados do simulador em JSON

Refs #32"
```

---

### Task 2: Recorte, calendário epidemiológico e previsão sazonal

**Files:**
- Create: `site/js/simulador/dados.js`
- Create: `site/js/simulador/previsao.js`
- Create: `tests/js/apoio.mjs`
- Create: `tests/js/previsao.test.mjs`

**Interfaces:**
- Consumes: `semanas` = array `{data: "AAAA-MM-DD", ano, se, casos, temp|null, umid|null, rt|null, nivel}` ordenado no tempo (Task 1).
- Produces (`dados.js`): `NIVEIS[1..4] = {nome, cor, texto}`, `chaveSE(ano, se) -> number`, `recortar(semanas, ano, se) -> semanas`, `carregarJSON(caminho) -> Promise<object>`, `formatarData("AAAA-MM-DD") -> "DD/MM/AAAA"`.
- Produces (`previsao.js`): `percentil(valores, p) -> number|null`, `mediana(valores)`, `semanaEpidemiologica(dataUTC: Date) -> {ano, se}`, `proximasSemanas(ultima, horizonte) -> [{data, ano, se}]`, `preverSazonal(semanas, horizonte = 4) -> {ajuste, semanas: [{data, ano, se, valor, inferior, superior}]} | null`, `faixaRisco(semanas) -> {p50, p75, p90}`, `nivelPorCasos(valor, faixa) -> 1..4`, `correlacaoDefasada(semanas, defasagem) -> {pares: [{x, y}], rho: number|null}`, `tendencia(semanas) -> {atual, anterior, variacao: number|null}`.

- [ ] **Step 1: Write the test helper and failing tests**

`tests/js/apoio.mjs`:

```js
const DIA = 24 * 60 * 60 * 1000;

// Domingo que abre a SE 1 do ano: 3 dias antes da primeira quarta-feira de janeiro.
function inicioSE1(ano) {
  const primeiroJan = Date.UTC(ano, 0, 1);
  const diaDaSemana = new Date(primeiroJan).getUTCDay();
  return primeiroJan + ((3 - diaDaSemana + 7) % 7) * DIA - 3 * DIA;
}

// Monta semanas sintéticas com datas reais: para cada ano, uma lista de casos (índice 0 = SE 1).
export function serie(casosPorAno, { temp = 25 } = {}) {
  const semanas = [];
  for (const [ano, lista] of Object.entries(casosPorAno)) {
    lista.forEach((casos, i) => {
      semanas.push({
        data: new Date(inicioSE1(Number(ano)) + i * 7 * DIA).toISOString().slice(0, 10),
        ano: Number(ano),
        se: i + 1,
        casos,
        temp,
        umid: 70,
        rt: 1,
        nivel: 1,
      });
    });
  }
  return semanas;
}

export const repetir = (valor, n) => Array.from({ length: n }, () => valor);
```

`tests/js/previsao.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import { recortar, formatarData } from "../../site/js/simulador/dados.js";
import {
  percentil,
  mediana,
  semanaEpidemiologica,
  proximasSemanas,
  preverSazonal,
  faixaRisco,
  nivelPorCasos,
  correlacaoDefasada,
  tendencia,
} from "../../site/js/simulador/previsao.js";
import { serie, repetir } from "./apoio.mjs";

test("recortar não devolve semana depois da referência", () => {
  const semanas = serie({ 2023: repetir(1, 52), 2024: repetir(2, 52) });
  const rec = recortar(semanas, 2024, 10);
  assert.equal(rec.at(-1).ano, 2024);
  assert.equal(rec.at(-1).se, 10);
  assert.equal(rec.length, 62);
});

test("formatarData", () => {
  assert.equal(formatarData("2024-03-03"), "03/03/2024");
});

test("percentil interpola e mediana de lista par", () => {
  assert.equal(percentil([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(mediana([5, 1, 3]), 3);
  assert.equal(percentil([], 0.5), null);
});

test("semanaEpidemiologica segue o calendário (2025 tem SE 53)", () => {
  assert.deepEqual(semanaEpidemiologica(new Date("2023-12-31T00:00:00Z")), { ano: 2024, se: 1 });
  assert.deepEqual(semanaEpidemiologica(new Date("2024-01-07T00:00:00Z")), { ano: 2024, se: 2 });
  assert.deepEqual(semanaEpidemiologica(new Date("2025-12-28T00:00:00Z")), { ano: 2025, se: 53 });
  assert.deepEqual(semanaEpidemiologica(new Date("2026-01-04T00:00:00Z")), { ano: 2026, se: 1 });
});

test("proximasSemanas atravessa a virada do ano", () => {
  const ultima = { data: "2025-12-21", ano: 2025, se: 52 };
  assert.deepEqual(proximasSemanas(ultima, 3), [
    { data: "2025-12-28", ano: 2025, se: 53 },
    { data: "2026-01-04", ano: 2026, se: 1 },
    { data: "2026-01-11", ano: 2026, se: 2 },
  ]);
});

test("preverSazonal devolve null com menos de 2 anos anteriores", () => {
  const semanas = serie({ 2023: repetir(5, 52), 2024: repetir(5, 10) });
  assert.equal(preverSazonal(semanas), null);
});

test("preverSazonal usa a mediana sazonal vezes o ajuste recente", () => {
  // Anos anteriores: 10 casos por semana em 2022 e 30 em 2023 -> mediana 20.
  // Últimas 4 semanas de 2024 têm 40 casos cada -> ajuste = 160 / 80 = 2.
  const semanas = serie({
    2022: repetir(10, 52),
    2023: repetir(30, 52),
    2024: repetir(40, 8),
  });
  const prev = preverSazonal(semanas);
  assert.equal(prev.ajuste, 2);
  assert.equal(prev.semanas.length, 4);
  assert.equal(prev.semanas[0].se, 9);
  assert.equal(prev.semanas[0].valor, 40);
  assert.equal(prev.semanas[0].inferior, 30);
  assert.equal(prev.semanas[0].superior, 50);
});

test("preverSazonal limita o ajuste a 0,25 quando a entressafra zera", () => {
  const semanas = serie({
    2022: repetir(10, 52),
    2023: repetir(30, 52),
    2024: repetir(0, 8),
  });
  assert.equal(preverSazonal(semanas).ajuste, 0.25);
});

test("preverSazonal usa ajuste 1 quando a base sazonal é zero", () => {
  const semanas = serie({
    2022: repetir(0, 52),
    2023: repetir(0, 52),
    2024: repetir(3, 8),
  });
  const prev = preverSazonal(semanas);
  assert.equal(prev.ajuste, 1);
  assert.equal(prev.semanas[0].valor, 0);
});

test("preverSazonal não lê semanas depois da última recebida", () => {
  const passado = serie({ 2022: repetir(10, 52), 2023: repetir(30, 52), 2024: repetir(40, 8) });
  const comFuturo = [...passado, ...serie({ 2024: repetir(9999, 52) }).slice(8)];
  assert.deepEqual(preverSazonal(passado), preverSazonal(recortar(comFuturo, 2024, 8)));
});

test("faixaRisco e nivelPorCasos", () => {
  const semanas = serie({ 2024: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] });
  const faixa = faixaRisco(semanas);
  assert.deepEqual(faixa, { p50: 50, p75: 75, p90: 90 });
  assert.equal(nivelPorCasos(0, faixa), 1);
  assert.equal(nivelPorCasos(50, faixa), 1);
  assert.equal(nivelPorCasos(60, faixa), 2);
  assert.equal(nivelPorCasos(80, faixa), 3);
  assert.equal(nivelPorCasos(91, faixa), 4);
});

test("correlacaoDefasada pula semanas sem temperatura", () => {
  const semanas = serie({ 2024: [1, 2, 3, 4, 5, 6] });
  semanas.forEach((s, i) => (s.temp = i + 20));
  semanas[1].temp = null;
  const { pares, rho } = correlacaoDefasada(semanas, 1);
  assert.equal(pares.length, 4);
  assert.ok(pares.every((p) => Number.isFinite(p.x)));
  assert.equal(rho, 1);
});

test("correlacaoDefasada devolve rho null com poucos pares", () => {
  const semanas = serie({ 2024: [1, 2] });
  assert.equal(correlacaoDefasada(semanas, 0).rho, null);
});

test("tendencia compara 4 semanas com as 4 anteriores", () => {
  const semanas = serie({ 2024: [1, 1, 1, 1, 2, 2, 2, 2] });
  assert.deepEqual(tendencia(semanas), { atual: 8, anterior: 4, variacao: 1 });
});

test("tendencia sem 8 semanas ou com anterior zero devolve variacao null", () => {
  assert.equal(tendencia(serie({ 2018: [5, 5, 5] })).variacao, null);
  assert.equal(tendencia(serie({ 2024: [0, 0, 0, 0, 2, 2, 2, 2] })).variacao, null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/js/*.test.mjs`
Expected: FAIL com `Cannot find module '.../site/js/simulador/dados.js'`

- [ ] **Step 3: Write `dados.js`**

```js
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
```

- [ ] **Step 4: Write `previsao.js`**

```js
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

export function preverSazonal(semanas, horizonte = 4) {
  if (semanas.length < 4) return null;
  const ultima = semanas.at(-1);
  const anosAnteriores = new Set(semanas.filter((s) => s.ano < ultima.ano).map((s) => s.ano));
  if (anosAnteriores.size < 2) return null;

  const recentes = semanas.slice(-4);
  const realRecente = soma(recentes.map((s) => s.casos));
  const baseRecente = soma(
    recentes.map((s) => mediana(valoresSazonais(semanas, s.se, ultima.ano)) ?? 0),
  );
  const ajuste = baseRecente === 0 ? 1 : limitar(realRecente / baseRecente, 0.25, 4);

  const projetadas = proximasSemanas(ultima, horizonte).map((alvo) => {
    const valores = valoresSazonais(semanas, alvo.se, ultima.ano);
    return {
      ...alvo,
      valor: (mediana(valores) ?? 0) * ajuste,
      inferior: (percentil(valores, 0.25) ?? 0) * ajuste,
      superior: (percentil(valores, 0.75) ?? 0) * ajuste,
    };
  });
  return { ajuste, semanas: projetadas };
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/js/*.test.mjs`
Expected: todos PASS. Se o Node reclamar do tipo de módulo de `site/js/simulador/*.js`, criar `site/js/simulador/package.json` com `{"type": "module"}` e rodar de novo.

- [ ] **Step 6: Commit**

```bash
git add site/js/simulador/dados.js site/js/simulador/previsao.js tests/js
git commit -m "feat: contas de previsão sazonal e clima do simulador

Refs #32"
```

---

### Task 3: Denúncias simuladas

**Files:**
- Create: `site/js/simulador/denuncias.js`
- Create: `tests/js/denuncias.test.mjs`

**Interfaces:**
- Consumes: `area_urbana` `[sul, oeste, norte, leste]` e `contorno` (FeatureCollection GeoJSON, coordenadas `[lon, lat]`) do JSON da Task 1.
- Produces: `SITUACOES = ["nova", "agendada", "vistoriada"]`, `mulberry32(semente) -> () => number`, `semente(geocode, ano, se) -> number`, `dentroDoContorno(lon, lat, contorno) -> boolean`, `setorDe(lat, lon, area) -> "A1".."D4"`, `quantidadeDenuncias(casos) -> number`, `gerarDenuncias({geocode, ano, se, casos, areaUrbana, contorno}) -> [{id, lat, lon, tipo, peso, idadeDias, situacao, setor, prioridade}]`, `contarAbertasPorSetor(lista) -> {setor: n}`, `ordenarFila(lista) -> lista`, `proximaSituacao(situacao) -> situacao`.

- [ ] **Step 1: Write the failing tests**

`tests/js/denuncias.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  mulberry32,
  semente,
  dentroDoContorno,
  setorDe,
  quantidadeDenuncias,
  gerarDenuncias,
  contarAbertasPorSetor,
  ordenarFila,
  proximaSituacao,
} from "../../site/js/simulador/denuncias.js";

const QUADRADO = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [[-49, -21], [-48, -21], [-48, -20], [-49, -20], [-49, -21]],
          [[-48.6, -20.6], [-48.4, -20.6], [-48.4, -20.4], [-48.6, -20.4], [-48.6, -20.6]],
        ],
      },
    },
  ],
};
const AREA = [-21, -49, -20, -48];
const BASE = { geocode: 3533908, ano: 2024, se: 10, casos: 200, areaUrbana: AREA, contorno: QUADRADO };

test("mulberry32 é reproduzível e fica entre 0 e 1", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const valores = [a(), a(), a()];
  assert.deepEqual(valores, [b(), b(), b()]);
  assert.ok(valores.every((v) => v >= 0 && v < 1));
  assert.notEqual(semente(3533908, 2024, 10), semente(3533908, 2024, 11));
});

test("dentroDoContorno respeita o buraco do polígono", () => {
  assert.equal(dentroDoContorno(-48.9, -20.9, QUADRADO), true);
  assert.equal(dentroDoContorno(-48.5, -20.5, QUADRADO), false);
  assert.equal(dentroDoContorno(-47.5, -20.5, QUADRADO), false);
});

test("dentroDoContorno aceita MultiPolygon", () => {
  const multi = {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: { type: "MultiPolygon", coordinates: [QUADRADO.features[0].geometry.coordinates] } }],
  };
  assert.equal(dentroDoContorno(-48.9, -20.9, multi), true);
});

test("setorDe: coluna pela longitude, linha de norte para sul", () => {
  assert.equal(setorDe(-20.01, -48.99, AREA), "A1");
  assert.equal(setorDe(-20.99, -48.01, AREA), "D4");
  assert.equal(setorDe(-21, -48, AREA), "D4");
});

test("quantidadeDenuncias = 4 + 15% dos casos, até 60", () => {
  assert.equal(quantidadeDenuncias(0), 4);
  assert.equal(quantidadeDenuncias(100), 19);
  assert.equal(quantidadeDenuncias(1000), 60);
});

test("gerarDenuncias: mesma semana gera a mesma fila", () => {
  assert.deepEqual(gerarDenuncias(BASE), gerarDenuncias(BASE));
  assert.notDeepEqual(gerarDenuncias(BASE), gerarDenuncias({ ...BASE, se: 11 }));
});

test("gerarDenuncias: quantidade certa e tudo dentro do contorno", () => {
  const lista = gerarDenuncias(BASE);
  assert.equal(lista.length, 34);
  assert.ok(lista.every((d) => dentroDoContorno(d.lon, d.lat, QUADRADO)));
  assert.ok(lista.every((d) => /^[A-D][1-4]$/.test(d.setor)));
  assert.ok(lista.every((d) => d.idadeDias >= 0 && d.idadeDias <= 14));
});

test("gerarDenuncias não trava se a área não cruza o contorno", () => {
  const lista = gerarDenuncias({ ...BASE, areaUrbana: [-10, -10, -9, -9] });
  assert.deepEqual(lista, []);
});

test("ordenarFila põe vistoriadas no fim e o resto por prioridade", () => {
  const fila = ordenarFila([
    { id: 1, prioridade: 9, situacao: "vistoriada" },
    { id: 2, prioridade: 3, situacao: "nova" },
    { id: 3, prioridade: 5, situacao: "agendada" },
  ]);
  assert.deepEqual(fila.map((d) => d.id), [3, 2, 1]);
});

test("contarAbertasPorSetor ignora vistoriadas", () => {
  const contagem = contarAbertasPorSetor([
    { setor: "A1", situacao: "nova" },
    { setor: "A1", situacao: "vistoriada" },
    { setor: "B2", situacao: "agendada" },
  ]);
  assert.deepEqual(contagem, { A1: 1, B2: 1 });
});

test("proximaSituacao avança e para em vistoriada", () => {
  assert.equal(proximaSituacao("nova"), "agendada");
  assert.equal(proximaSituacao("agendada"), "vistoriada");
  assert.equal(proximaSituacao("vistoriada"), "vistoriada");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/js/denuncias.test.mjs`
Expected: FAIL com `Cannot find module '.../denuncias.js'`

- [ ] **Step 3: Write `denuncias.js`**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/js/*.test.mjs`
Expected: todos PASS (Tasks 2 e 3).

- [ ] **Step 5: Commit**

```bash
git add site/js/simulador/denuncias.js tests/js/denuncias.test.mjs
git commit -m "feat: denúncias simuladas com semente e setores

Refs #32"
```

---

### Task 4: Página, seletores e "Como estamos"

**Files:**
- Create: `site/simulador.html`
- Create: `site/css/simulador.css`
- Create: `site/js/simulador/graficos.js`
- Create: `site/js/simulador/main.js`

**Interfaces:**
- Consumes: `carregarJSON`, `recortar`, `formatarData`, `NIVEIS` (Task 2); `tendencia` (Task 2).
- Produces: `graficos.js` exporta `desenharBarras(canvas, semanas)`; `main.js` exporta nada, guarda `estado = {municipio, indice, defasagem, denuncias}` e chama `renderizar()`. As Tasks 5 e 6 acrescentam funções `renderizarPrevisao(rec)`, `renderizarClima(rec)` e `renderizarDenuncias(rec)` dentro de `renderizar()`.

- [ ] **Step 1: Write `site/simulador.html`**

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Simulador · Vigilância da Dengue</title>
  <meta name="description" content="Simulação do sistema de vigilância da dengue: casos, previsão de risco e fila de denúncias por município.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
  <link rel="stylesheet" href="css/simulador.css">
</head>
<body>
  <header class="topo">
    <div class="marca">
      <span class="marca-fatec">Fatec <small>Olímpia</small></span>
      <h1>Vigilância da Dengue <span id="titulo-municipio"></span></h1>
    </div>
    <div class="controles">
      <label class="controle">
        <span>Município</span>
        <select id="municipio"></select>
      </label>
      <div class="controle controle-semana">
        <span id="semana-legenda">Semana de referência</span>
        <div class="semana-linha">
          <button type="button" id="semana-anterior" aria-label="Semana anterior">‹</button>
          <input type="range" id="semana" min="0" max="0" value="0" aria-labelledby="semana-legenda">
          <button type="button" id="semana-proxima" aria-label="Próxima semana">›</button>
        </div>
        <output id="semana-rotulo" for="semana"></output>
      </div>
      <div class="atalhos">
        <button type="button" id="ir-pico">Maior pico</button>
        <button type="button" id="ir-ultima">Última semana</button>
      </div>
    </div>
  </header>

  <p class="faixa-simulador" role="note">
    <strong>SIMULADOR:</strong> casos e clima reais (InfoDengue); previsão, denúncias e mapa são simulados.
  </p>

  <main>
    <section aria-labelledby="titulo-como">
      <h2 id="titulo-como">Como estamos</h2>
      <div class="cards">
        <article class="card">
          <h3>Casos na semana</h3>
          <p class="valor" id="card-casos">—</p>
          <p class="detalhe" id="card-casos-detalhe"></p>
        </article>
        <article class="card">
          <h3>Nível de alerta</h3>
          <p class="valor"><span class="chip" id="card-nivel">—</span></p>
          <p class="detalhe">Classificação do InfoDengue</p>
        </article>
        <article class="card">
          <h3>Rt (número de reprodução)</h3>
          <p class="valor" id="card-rt">—</p>
          <p class="detalhe" id="card-rt-detalhe"></p>
        </article>
        <article class="card">
          <h3>Tendência</h3>
          <p class="valor" id="card-tendencia">—</p>
          <p class="detalhe" id="card-tendencia-detalhe">Últimas 4 semanas contra as 4 anteriores</p>
        </article>
      </div>
      <article class="painel">
        <h3>Casos por semana · últimas 52 semanas</h3>
        <div class="grafico"><canvas id="grafico-barras" role="img"></canvas></div>
        <ul class="legenda" id="legenda-niveis"></ul>
        <details>
          <summary>Ver as últimas 12 semanas em tabela</summary>
          <table>
            <thead><tr><th>Semana</th><th>Início</th><th>Casos</th><th>Nível</th></tr></thead>
            <tbody id="tabela-semanas"></tbody>
          </table>
        </details>
      </article>
    </section>
  </main>

  <footer class="rodape">
    <p>Fonte: <span id="rodape-fonte">InfoDengue (Fiocruz/FGV)</span> · dados até <span id="rodape-data">—</span></p>
    <p>Protótipo de demonstração. Não substitui o boletim oficial da Secretaria de Saúde. Com sintomas, procure a UBS.</p>
    <p>Projeto de extensão · Desenvolvimento de Software Multiplataforma · Fatec Olímpia</p>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <script type="module" src="js/simulador/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `site/css/simulador.css`**

```css
:root {
  color-scheme: light;
  --fundo: #f5f6f7;
  --superficie: #ffffff;
  --tinta: #1f2937;
  --tinta-2: #4b5563;
  --tinta-3: #6b7280;
  --linha: #e5e7eb;
  --marca: #b20f17;
  --serie: #2f6db5;
  --raio: 10px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--fundo);
  color: var(--tinta);
  font-family: "Inter", system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.45;
}

h1, h2, h3 { margin: 0; }
h2 { font-size: 1.15rem; color: var(--tinta-2); margin: 28px 0 12px; }
h3 { font-size: 0.95rem; font-weight: 600; color: var(--tinta-2); }

.topo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
  background: var(--superficie);
  border-bottom: 3px solid var(--marca);
}
.marca { display: flex; align-items: center; gap: 16px; }
.marca-fatec { font-weight: 700; font-size: 1.6rem; color: var(--tinta-3); line-height: 1; }
.marca-fatec small { display: block; font-size: 0.7rem; color: var(--marca); text-align: right; }
.marca h1 { font-size: 1.35rem; }
#titulo-municipio { color: var(--marca); }

.controles { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; }
.controle { display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; color: var(--tinta-3); }
.controle select, .atalhos button, .semana-linha button {
  font: inherit; font-size: 0.9rem; color: var(--tinta);
  background: var(--superficie); border: 1px solid #cbd0d6; border-radius: 6px; padding: 6px 10px;
  min-height: 36px; cursor: pointer;
}
.semana-linha { display: flex; align-items: center; gap: 6px; }
.semana-linha input { width: 220px; accent-color: var(--marca); }
#semana-rotulo { font-size: 0.85rem; color: var(--tinta); font-weight: 600; }
.atalhos { display: flex; gap: 8px; }

.faixa-simulador {
  margin: 0; padding: 8px 24px; background: #fff7e0; color: #5c4400;
  border-bottom: 1px solid #f0dfa8; font-size: 0.85rem;
}

main { max-width: 1280px; margin: 0 auto; padding: 0 24px 32px; }

.cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.card, .painel {
  background: var(--superficie); border-radius: var(--raio); padding: 16px 20px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
}
.card .valor { font-size: 2rem; font-weight: 700; margin: 8px 0 4px; }
.card .detalhe { margin: 0; font-size: 0.82rem; color: var(--tinta-3); }
.chip {
  display: inline-block; font-size: 1rem; font-weight: 700; padding: 4px 12px;
  border-radius: 6px; background: var(--linha);
}
.chip-pequeno { font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; font-weight: 600; }

.painel { margin-top: 16px; }
.grafico { position: relative; height: 260px; margin-top: 12px; }

.legenda { display: flex; flex-wrap: wrap; gap: 16px; list-style: none; padding: 0; margin: 12px 0 0; font-size: 0.82rem; color: var(--tinta-2); }
.legenda li::before {
  content: ""; display: inline-block; width: 10px; height: 10px; border-radius: 2px;
  margin-right: 6px; background: var(--cor);
}

details { margin-top: 12px; font-size: 0.85rem; }
summary { cursor: pointer; color: var(--tinta-2); }
table { border-collapse: collapse; margin-top: 8px; width: 100%; max-width: 520px; }
th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--linha); font-variant-numeric: tabular-nums; }

.rodape { max-width: 1280px; margin: 0 auto; padding: 16px 24px 32px; border-top: 1px solid var(--linha); font-size: 0.8rem; color: var(--tinta-3); }
.rodape p { margin: 4px 0; }

button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid var(--serie); outline-offset: 2px; }

@media (max-width: 900px) {
  .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 560px) {
  .topo, .faixa-simulador { padding-left: 16px; padding-right: 16px; }
  main { padding: 0 16px 24px; }
  .cards { grid-template-columns: 1fr 1fr; gap: 10px; }
  .card { padding: 12px 14px; }
  .card .valor { font-size: 1.5rem; }
  .semana-linha input { width: 100%; }
  .controle-semana { flex: 1 1 100%; }
  .marca h1 { font-size: 1.1rem; }
}
```

- [ ] **Step 3: Write `site/js/simulador/graficos.js`**

```js
// Desenho dos gráficos com Chart.js (carregado como global pelo <script> da página).
import { NIVEIS, formatarData } from "./dados.js";

const Chart = globalThis.Chart;
const graficos = {};
const numero = new Intl.NumberFormat("pt-BR");

Chart.defaults.font.family = "Inter, system-ui, sans-serif";
Chart.defaults.color = "#4b5563";

function trocar(canvas, config) {
  graficos[canvas.id]?.destroy();
  graficos[canvas.id] = new Chart(canvas, config);
}

const eixoY = {
  beginAtZero: true,
  grid: { color: "#eef0f2" },
  border: { display: false },
  ticks: { callback: (v) => numero.format(v) },
};

export function desenharBarras(canvas, semanas) {
  trocar(canvas, {
    type: "bar",
    data: {
      labels: semanas.map((s) => `SE ${s.se}/${s.ano}`),
      datasets: [
        {
          data: semanas.map((s) => s.casos),
          backgroundColor: semanas.map((s) => NIVEIS[s.nivel].cor),
          borderRadius: { topLeft: 4, topRight: 4 },
          borderSkipped: "start",
          maxBarThickness: 24,
          categoryPercentage: 0.92,
          barPercentage: 0.92,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (itens) => {
              const s = semanas[itens[0].dataIndex];
              return `SE ${s.se}/${s.ano} · início ${formatarData(s.data)}`;
            },
            label: (item) => {
              const s = semanas[item.dataIndex];
              return `${numero.format(s.casos)} casos · nível ${NIVEIS[s.nivel].nome}`;
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: 8, maxRotation: 0 } },
        y: eixoY,
      },
    },
  });
}
```

- [ ] **Step 4: Write `site/js/simulador/main.js`**

```js
// Estado do simulador e ligação dos painéis.
import { carregarJSON, recortar, formatarData, NIVEIS } from "./dados.js";
import { tendencia } from "./previsao.js";
import { desenharBarras } from "./graficos.js";

const $ = (id) => document.getElementById(id);
const numero = new Intl.NumberFormat("pt-BR");
const PASTA = "dados/simulador";

const estado = { municipio: null, indice: 0, defasagem: 4, denuncias: [] };

function semanaAtual() {
  return estado.municipio.semanas[estado.indice];
}

function recorteAtual() {
  const { ano, se } = semanaAtual();
  return recortar(estado.municipio.semanas, ano, se);
}

function pintarChip(elemento, nivel) {
  elemento.textContent = NIVEIS[nivel].nome;
  elemento.style.background = NIVEIS[nivel].cor;
  elemento.style.color = NIVEIS[nivel].texto;
}

function renderizarComoEstamos(rec) {
  const atual = rec.at(-1);
  $("card-casos").textContent = numero.format(atual.casos);
  $("card-casos-detalhe").textContent = `SE ${atual.se}/${atual.ano} · início ${formatarData(atual.data)}`;
  pintarChip($("card-nivel"), atual.nivel);

  if (atual.rt === null) {
    $("card-rt").textContent = "—";
    $("card-rt-detalhe").textContent = "Sem estimativa nesta semana";
  } else {
    $("card-rt").textContent = atual.rt.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    $("card-rt-detalhe").textContent = atual.rt > 1 ? "Acima de 1: transmissão em expansão" : "Até 1: transmissão estável ou em queda";
  }

  const t = tendencia(rec);
  if (t.variacao === null) {
    $("card-tendencia").textContent = "—";
    $("card-tendencia-detalhe").textContent = t.anterior === null ? "Histórico curto demais" : "Sem casos nas 4 semanas anteriores";
  } else {
    const seta = t.variacao > 0 ? "▲" : t.variacao < 0 ? "▼" : "■";
    $("card-tendencia").textContent = `${seta} ${Math.round(Math.abs(t.variacao) * 100)}%`;
    $("card-tendencia-detalhe").textContent = `${numero.format(t.atual)} casos nas últimas 4 semanas, contra ${numero.format(t.anterior)}`;
  }

  const ultimas52 = rec.slice(-52);
  const canvas = $("grafico-barras");
  desenharBarras(canvas, ultimas52);
  const maior = ultimas52.reduce((a, b) => (b.casos > a.casos ? b : a));
  canvas.setAttribute(
    "aria-label",
    `Casos por semana nas últimas ${ultimas52.length} semanas. Maior valor: ${numero.format(maior.casos)} casos na SE ${maior.se}/${maior.ano}.`,
  );

  $("tabela-semanas").innerHTML = rec
    .slice(-12)
    .reverse()
    .map((s) => `<tr><td>SE ${s.se}/${s.ano}</td><td>${formatarData(s.data)}</td><td>${numero.format(s.casos)}</td><td>${NIVEIS[s.nivel].nome}</td></tr>`)
    .join("");
}

function renderizar() {
  const atual = semanaAtual();
  $("semana").value = estado.indice;
  $("semana-rotulo").textContent = `SE ${atual.se}/${atual.ano} · ${formatarData(atual.data)}`;
  const rec = recorteAtual();
  renderizarComoEstamos(rec);
}

async function trocarMunicipio(geocode) {
  estado.municipio = await carregarJSON(`${PASTA}/${geocode}.json`);
  const { nome, uf, semanas, fonte } = estado.municipio;
  $("titulo-municipio").textContent = `· ${nome}/${uf}`;
  document.title = `Simulador · Vigilância da Dengue · ${nome}/${uf}`;
  $("semana").max = semanas.length - 1;
  $("rodape-fonte").textContent = fonte;
  $("rodape-data").textContent = formatarData(semanas.at(-1).data);
  estado.indice = semanas.length - 1;
  renderizar();
}

function irPara(indice) {
  const ultimo = estado.municipio.semanas.length - 1;
  estado.indice = Math.min(ultimo, Math.max(0, indice));
  renderizar();
}

function montarLegenda() {
  $("legenda-niveis").innerHTML = NIVEIS.slice(1)
    .map((n) => `<li style="--cor:${n.cor}">${n.nome}</li>`)
    .join("");
}

async function iniciar() {
  montarLegenda();
  const municipios = await carregarJSON(`${PASTA}/municipios.json`);
  $("municipio").innerHTML = municipios
    .map((m) => `<option value="${m.geocode}">${m.nome}/${m.uf}</option>`)
    .join("");
  $("municipio").addEventListener("change", (e) => trocarMunicipio(e.target.value));
  $("semana").addEventListener("input", (e) => irPara(Number(e.target.value)));
  $("semana-anterior").addEventListener("click", () => irPara(estado.indice - 1));
  $("semana-proxima").addEventListener("click", () => irPara(estado.indice + 1));
  $("ir-ultima").addEventListener("click", () => irPara(Infinity));
  $("ir-pico").addEventListener("click", () => {
    const semanas = estado.municipio.semanas;
    irPara(semanas.reduce((melhor, s, i) => (s.casos > semanas[melhor].casos ? i : melhor), 0));
  });
  await trocarMunicipio(municipios[0].geocode);
}

iniciar().catch((erro) => {
  console.error(erro);
  document.querySelector("main").insertAdjacentHTML(
    "afterbegin",
    `<p class="painel" role="alert">Não foi possível carregar os dados do simulador (${erro.message}). Abra a página por um servidor: <code>python -m http.server -d site</code>.</p>`,
  );
});
```

- [ ] **Step 5: Verify in the browser**

Run (em segundo plano): `python3 -m http.server 8765 -d site`
Abrir `http://localhost:8765/simulador.html` no Chrome. Expected: cabeçalho, faixa amarela do simulador, 4 cards preenchidos para Olímpia na SE 40/2026, barras coloridas, legenda com 4 níveis; trocar para Itanhaém e Viçosa atualiza tudo; "Maior pico" leva à SE 18/2024 (ou ao pico real do município); console sem erros.

- [ ] **Step 6: Commit**

```bash
git add site/simulador.html site/css/simulador.css site/js/simulador/graficos.js site/js/simulador/main.js
git commit -m "feat: página do simulador com seletores e painel de casos

Refs #32"
```

---

### Task 5: "O que vem aí": previsão e clima

**Files:**
- Modify: `site/simulador.html` (nova `<section>` depois de "Como estamos")
- Modify: `site/css/simulador.css` (grade de 2 colunas, selo "simulado")
- Modify: `site/js/simulador/graficos.js` (`desenharPrevisao`, `desenharClima`)
- Modify: `site/js/simulador/main.js` (`renderizarPrevisao`, `renderizarClima`, controle de defasagem)

**Interfaces:**
- Consumes: `preverSazonal(semanas) -> {ajuste, semanas: [{data, ano, se, valor, inferior, superior}]} | null`, `faixaRisco`, `nivelPorCasos`, `correlacaoDefasada` (Task 2).
- Produces: `desenharPrevisao(canvas, reais, previsao)` e `desenharClima(canvas, pares, defasagem)` em `graficos.js`.

- [ ] **Step 1: Add the section to `simulador.html`** (logo depois do `</section>` de "Como estamos", dentro do `<main>`)

```html
    <section aria-labelledby="titulo-vem">
      <h2 id="titulo-vem">O que vem aí</h2>
      <div class="grade-2">
        <article class="painel">
          <div class="painel-topo">
            <h3>Previsão das próximas 4 semanas</h3>
            <span class="selo">simulado</span>
          </div>
          <div class="grafico" id="previsao-grafico"><canvas id="grafico-previsao" role="img"></canvas></div>
          <ul class="previsao-lista" id="previsao-lista"></ul>
          <p class="nota" id="previsao-nota"></p>
        </article>
        <article class="painel">
          <div class="painel-topo">
            <h3>Temperatura de N semanas atrás × casos</h3>
            <span class="selo selo-real">dado real</span>
          </div>
          <label class="defasagem">
            Defasagem: <input type="range" id="defasagem" min="0" max="10" value="4">
            <output id="defasagem-rotulo" for="defasagem">4 semanas</output>
          </label>
          <div class="grafico"><canvas id="grafico-clima" role="img"></canvas></div>
          <p class="nota" id="clima-nota"></p>
        </article>
      </div>
    </section>
```

- [ ] **Step 2: Add CSS** (no fim de `simulador.css`, antes dos `@media`)

```css
.grade-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.grade-2 .painel { margin-top: 0; }
.painel-topo { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.selo {
  font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
  color: #5c4400; background: #fff1c2; border: 1px solid #ecd58a; border-radius: 999px; padding: 2px 10px;
}
.selo-real { color: #1f4d2a; background: #e3f2e5; border-color: #b9dcbf; }
.nota { font-size: 0.8rem; color: var(--tinta-3); margin: 10px 0 0; }
.previsao-lista { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 6px; font-size: 0.88rem; }
.previsao-lista li { display: flex; justify-content: space-between; gap: 8px; align-items: center; font-variant-numeric: tabular-nums; }
.defasagem { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--tinta-2); margin-top: 8px; }
.defasagem input { accent-color: var(--serie); }
```

E dentro de `@media (max-width: 900px)` acrescentar:

```css
  .grade-2 { grid-template-columns: 1fr; }
```

- [ ] **Step 3: Add `desenharPrevisao` and `desenharClima` to `graficos.js`**

```js
export function desenharPrevisao(canvas, reais, previsao) {
  const projetadas = previsao.semanas;
  const labels = [...reais, ...projetadas].map((s) => `SE ${s.se}/${s.ano}`);
  const vazios = (n) => Array.from({ length: n }, () => null);
  const ultimoReal = reais.at(-1).casos;
  trocar(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Casos notificados",
          data: [...reais.map((s) => s.casos), ...vazios(projetadas.length)],
          borderColor: "#2f6db5",
          backgroundColor: "#2f6db5",
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
        {
          label: "Projeção simulada",
          data: [...vazios(reais.length - 1), ultimoReal, ...projetadas.map((p) => Math.round(p.valor))],
          borderColor: "#1f2937",
          backgroundColor: "#1f2937",
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 4,
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
        },
        {
          label: "Faixa (percentis 25–75)",
          data: [...vazios(reais.length - 1), ultimoReal, ...projetadas.map((p) => Math.round(p.superior))],
          borderWidth: 0,
          pointRadius: 0,
          backgroundColor: "rgb(31 41 55 / 0.10)",
          fill: "+1",
        },
        {
          label: "faixa-inferior",
          data: [...vazios(reais.length - 1), ultimoReal, ...projetadas.map((p) => Math.round(p.inferior))],
          borderWidth: 0,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 12, boxHeight: 12, filter: (item) => item.text !== "faixa-inferior" },
        },
        tooltip: {
          filter: (item) => item.dataset.label !== "faixa-inferior" && item.raw !== null,
          callbacks: { label: (item) => `${item.dataset.label}: ${numero.format(item.raw)}` },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: 6, maxRotation: 0 } },
        y: eixoY,
      },
    },
  });
}

export function desenharClima(canvas, pares, defasagem) {
  trocar(canvas, {
    type: "scatter",
    data: {
      datasets: [
        {
          data: pares,
          backgroundColor: "rgb(47 109 181 / 0.75)",
          borderColor: "#ffffff",
          borderWidth: 1,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => `${item.raw.x.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} °C há ${defasagem} sem. · ${numero.format(item.raw.y)} casos`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: `Temperatura média de ${defasagem} semana(s) antes (°C)` },
          grid: { color: "#eef0f2" },
          border: { display: false },
        },
        y: { ...eixoY, title: { display: true, text: "Casos na semana" } },
      },
    },
  });
}
```

- [ ] **Step 4: Wire it in `main.js`**

Trocar os imports do topo por:

```js
import { carregarJSON, recortar, formatarData, NIVEIS } from "./dados.js";
import { tendencia, preverSazonal, faixaRisco, nivelPorCasos, correlacaoDefasada } from "./previsao.js";
import { desenharBarras, desenharPrevisao, desenharClima } from "./graficos.js";
```

Acrescentar, depois de `renderizarComoEstamos`:

```js
function renderizarPrevisao(rec) {
  const previsao = preverSazonal(rec);
  const lista = $("previsao-lista");
  if (previsao === null) {
    $("previsao-grafico").hidden = true;
    lista.innerHTML = "";
    $("previsao-nota").textContent =
      "Histórico insuficiente: a conta precisa de pelo menos 2 anos antes da semana escolhida.";
    return;
  }
  $("previsao-grafico").hidden = false;
  const faixa = faixaRisco(rec);
  const canvas = $("grafico-previsao");
  desenharPrevisao(canvas, rec.slice(-12), previsao);
  lista.innerHTML = previsao.semanas
    .map((p) => {
      const nivel = NIVEIS[nivelPorCasos(p.valor, faixa)];
      return `<li><span>SE ${p.se}/${p.ano}</span><span>~${numero.format(Math.round(p.valor))} casos (${numero.format(Math.round(p.inferior))}–${numero.format(Math.round(p.superior))})</span><span class="chip chip-pequeno" style="background:${nivel.cor};color:${nivel.texto}">Risco ${nivel.nome}</span></li>`;
    })
    .join("");
  const ajuste = previsao.ajuste.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  canvas.setAttribute("aria-label", `Casos das últimas 12 semanas e projeção simulada das próximas 4: ${previsao.semanas.map((p) => Math.round(p.valor)).join(", ")} casos.`);
  $("previsao-nota").textContent =
    `Conta ilustrativa: mediana da mesma época nos anos anteriores, ajustada pelas últimas 4 semanas (×${ajuste}). ` +
    "A previsão de verdade é a entrega da Fase 6. A faixa de risco usa o histórico do próprio município e não é o critério do InfoDengue.";
}

function renderizarClima(rec) {
  const { pares, rho } = correlacaoDefasada(rec, estado.defasagem);
  const canvas = $("grafico-clima");
  desenharClima(canvas, pares, estado.defasagem);
  const texto = rho === null ? "sem dados suficientes" : `correlação de postos ${rho.toLocaleString("pt-BR")}`;
  canvas.setAttribute("aria-label", `Dispersão de ${pares.length} semanas: temperatura de ${estado.defasagem} semanas antes contra casos; ${texto}.`);
  $("clima-nota").textContent =
    `${pares.length} semanas até a referência; ${texto}. ` +
    "Associação, não causa: o calor das semanas anteriores costuma vir antes do aumento de casos.";
}
```

Em `renderizar()`, depois de `renderizarComoEstamos(rec);`, acrescentar:

```js
  renderizarPrevisao(rec);
  renderizarClima(rec);
```

Em `iniciar()`, antes de `await trocarMunicipio(...)`, acrescentar:

```js
  $("defasagem").addEventListener("input", (e) => {
    estado.defasagem = Number(e.target.value);
    $("defasagem-rotulo").textContent = `${estado.defasagem} semana${estado.defasagem === 1 ? "" : "s"}`;
    renderizarClima(recorteAtual());
  });
```

- [ ] **Step 5: Verify in the browser**

Recarregar `http://localhost:8765/simulador.html`. Expected: na SE 40/2026, previsão com 4 semanas, selo "simulado", lista com risco; mover a semana para a SE 5/2018 mostra "Histórico insuficiente"; ir para 2020 mostra previsão; o controle deslizante de defasagem muda o gráfico e o texto da correlação; console sem erros.

- [ ] **Step 6: Run tests and commit**

Run: `node --test tests/js/*.test.mjs` → PASS.

```bash
git add site/simulador.html site/css/simulador.css site/js/simulador/graficos.js site/js/simulador/main.js
git commit -m "feat: previsão simulada e painel de clima no simulador

Refs #32"
```

---

### Task 6: "Onde agir primeiro": mapa e fila de denúncias

**Files:**
- Create: `site/js/simulador/mapa.js`
- Modify: `site/simulador.html` (nova `<section>`)
- Modify: `site/css/simulador.css`
- Modify: `site/js/simulador/main.js` (`renderizarDenuncias`, `renderizarFila`, clique e mudança de situação)

**Interfaces:**
- Consumes: `gerarDenuncias`, `ordenarFila`, `contarAbertasPorSetor`, `proximaSituacao` (Task 3); `estado.municipio.contorno`, `estado.municipio.area_urbana` (Task 1).
- Produces: `mapa.js` exporta `iniciarMapa(idElemento)`, `mostrarMunicipio(contorno, areaUrbana)`, `mostrarDenuncias(denuncias, areaUrbana, aoSelecionar)`, `destacar(id)`.

- [ ] **Step 1: Write `site/js/simulador/mapa.js`**

```js
// Mapa com Leaflet (global L) e tiles do OpenStreetMap.
import { contarAbertasPorSetor } from "./denuncias.js";

const L = globalThis.L;
const COR_SITUACAO = { nova: "#a8212b", agendada: "#2f6db5", vistoriada: "#9ca3af" };

let mapa;
let camadaContorno;
let camadaSetores;
let camadaPontos;
const marcadores = new Map();

export function iniciarMapa(idElemento) {
  mapa = L.map(idElemento, { scrollWheelZoom: false });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);
}

export function mostrarMunicipio(contorno, [sul, oeste, norte, leste]) {
  camadaContorno?.remove();
  camadaContorno = L.geoJSON(contorno, {
    style: { color: "#b20f17", weight: 2, fill: false },
    interactive: false,
  }).addTo(mapa);
  mapa.fitBounds([[sul, oeste], [norte, leste]], { padding: [8, 8] });
}

export function mostrarDenuncias(denuncias, [sul, oeste, norte, leste], aoSelecionar) {
  camadaSetores?.remove();
  camadaPontos?.remove();
  marcadores.clear();

  const carga = contarAbertasPorSetor(denuncias);
  const maximo = Math.max(1, ...Object.values(carga));
  const passoLat = (norte - sul) / 4;
  const passoLon = (leste - oeste) / 4;
  camadaSetores = L.layerGroup().addTo(mapa);
  const setoresComDenuncia = new Set(denuncias.map((d) => d.setor));
  for (let coluna = 0; coluna < 4; coluna++) {
    for (let linha = 0; linha < 4; linha++) {
      const setor = `${"ABCD"[coluna]}${linha + 1}`;
      if (!setoresComDenuncia.has(setor)) continue;
      const abertas = carga[setor] ?? 0;
      const topo = norte - linha * passoLat;
      const esquerda = oeste + coluna * passoLon;
      L.rectangle(
        [[topo - passoLat, esquerda], [topo, esquerda + passoLon]],
        { color: "#a8212b", weight: 1, opacity: 0.35, fillColor: "#a8212b", fillOpacity: 0.06 + 0.34 * (abertas / maximo) },
      )
        .bindTooltip(`Setor ${setor} · ${abertas} denúncia(s) aberta(s)`)
        .addTo(camadaSetores);
    }
  }

  camadaPontos = L.layerGroup().addTo(mapa);
  for (const d of denuncias) {
    const marcador = L.circleMarker([d.lat, d.lon], {
      radius: 6,
      color: "#ffffff",
      weight: 2,
      fillColor: COR_SITUACAO[d.situacao],
      fillOpacity: 1,
    })
      .bindTooltip(`#${d.id} · ${d.tipo} · ${d.situacao}`)
      .on("click", () => aoSelecionar(d.id))
      .addTo(camadaPontos);
    marcadores.set(d.id, marcador);
  }
}

export function destacar(id) {
  for (const [chave, marcador] of marcadores) {
    marcador.setRadius(chave === id ? 10 : 6);
  }
  const marcador = marcadores.get(id);
  if (marcador) {
    marcador.bringToFront();
    marcador.openTooltip();
    mapa.panTo(marcador.getLatLng());
  }
}

export function corDaSituacao(situacao) {
  return COR_SITUACAO[situacao];
}
```

- [ ] **Step 2: Add the section to `simulador.html`** (depois da seção "O que vem aí")

```html
    <section aria-labelledby="titulo-agir">
      <h2 id="titulo-agir">Onde agir primeiro</h2>
      <div class="grade-mapa">
        <article class="painel painel-mapa">
          <div class="painel-topo">
            <h3>Denúncias de criadouro por setor</h3>
            <span class="selo">simulado</span>
          </div>
          <div id="mapa" role="region" aria-label="Mapa das denúncias simuladas"></div>
          <ul class="legenda">
            <li style="--cor:#a8212b">Nova</li>
            <li style="--cor:#2f6db5">Agendada</li>
            <li style="--cor:#9ca3af">Vistoriada</li>
            <li class="legenda-setor">Setor: quanto mais escuro, mais denúncias abertas</li>
          </ul>
        </article>
        <article class="painel painel-fila">
          <div class="painel-topo">
            <h3>Fila de denúncias</h3>
            <span class="selo">simulado</span>
          </div>
          <p class="nota" id="fila-resumo"></p>
          <ol class="fila" id="fila"></ol>
        </article>
      </div>
    </section>
```

- [ ] **Step 3: Add CSS** (antes dos `@media`)

```css
.grade-mapa { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 16px; }
.grade-mapa .painel { margin-top: 0; }
#mapa { height: 460px; margin-top: 12px; border-radius: 8px; }
.legenda-setor::before { background: rgb(168 33 43 / 0.3) !important; }
.painel-fila { display: flex; flex-direction: column; }
.fila { list-style: none; padding: 0; margin: 8px 0 0; overflow-y: auto; max-height: 470px; }
.fila li {
  display: grid; grid-template-columns: auto 1fr auto; gap: 4px 10px; align-items: center;
  padding: 8px 6px; border-bottom: 1px solid var(--linha); cursor: pointer; border-radius: 6px;
}
.fila li:hover, .fila li.selecionada { background: #f1f5fb; }
.fila .bolinha { width: 10px; height: 10px; border-radius: 50%; background: var(--cor); }
.fila .tipo { font-weight: 600; font-size: 0.88rem; }
.fila .meta { grid-column: 2; font-size: 0.78rem; color: var(--tinta-3); }
.fila button {
  grid-row: 1 / span 2; grid-column: 3; font: inherit; font-size: 0.78rem; padding: 4px 8px; min-height: 32px;
  border: 1px solid #cbd0d6; border-radius: 6px; background: var(--superficie); cursor: pointer;
}
.fila button:disabled { opacity: 0.5; cursor: default; }
```

Dentro de `@media (max-width: 900px)` acrescentar:

```css
  .grade-mapa { grid-template-columns: 1fr; }
  #mapa { height: 340px; }
  .fila { max-height: none; }
```

- [ ] **Step 4: Wire it in `main.js`**

Acrescentar aos imports:

```js
import { gerarDenuncias, ordenarFila, proximaSituacao } from "./denuncias.js";
import { iniciarMapa, mostrarMunicipio, mostrarDenuncias, destacar, corDaSituacao } from "./mapa.js";
```

Acrescentar depois de `renderizarClima`:

```js
const ROTULO_ACAO = { nova: "Agendar", agendada: "Vistoriar", vistoriada: "Vistoriada" };

function selecionarDenuncia(id) {
  for (const item of $("fila").children) {
    item.classList.toggle("selecionada", Number(item.dataset.id) === id);
  }
  $("fila").querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: "nearest" });
  destacar(id);
}

function renderizarFila() {
  const fila = ordenarFila(estado.denuncias);
  const abertas = fila.filter((d) => d.situacao !== "vistoriada").length;
  $("fila-resumo").textContent =
    `${abertas} aberta(s) de ${fila.length}. Ordem por prioridade: tipo do criadouro, dias em espera e quantas denúncias o setor já tem.`;
  $("fila").innerHTML = fila
    .map(
      (d) => `<li data-id="${d.id}">
        <span class="bolinha" style="--cor:${corDaSituacao(d.situacao)}" aria-hidden="true"></span>
        <span class="tipo">#${d.id} · ${d.tipo}</span>
        <span class="meta">Setor ${d.setor} · ${d.idadeDias} dia(s) · ${d.situacao} · prioridade ${d.prioridade.toLocaleString("pt-BR")}</span>
        <button type="button" data-acao="${d.id}" ${d.situacao === "vistoriada" ? "disabled" : ""}>${ROTULO_ACAO[d.situacao]}</button>
      </li>`,
    )
    .join("");
  mostrarDenuncias(estado.denuncias, estado.municipio.area_urbana, selecionarDenuncia);
}

function renderizarDenuncias(rec) {
  const atual = rec.at(-1);
  estado.denuncias = gerarDenuncias({
    geocode: estado.municipio.geocode,
    ano: atual.ano,
    se: atual.se,
    casos: atual.casos,
    areaUrbana: estado.municipio.area_urbana,
    contorno: estado.municipio.contorno,
  });
  renderizarFila();
}
```

Em `renderizar()`, depois de `renderizarClima(rec);`, acrescentar:

```js
  renderizarDenuncias(rec);
```

Em `trocarMunicipio`, antes de `renderizar();`, acrescentar:

```js
  mostrarMunicipio(estado.municipio.contorno, estado.municipio.area_urbana);
```

Em `iniciar()`, no começo (depois de `montarLegenda();`), acrescentar:

```js
  iniciarMapa("mapa");
  $("fila").addEventListener("click", (e) => {
    const botao = e.target.closest("button[data-acao]");
    const item = e.target.closest("li[data-id]");
    if (botao) {
      const denuncia = estado.denuncias.find((d) => d.id === Number(botao.dataset.acao));
      denuncia.situacao = proximaSituacao(denuncia.situacao);
      renderizarFila();
      selecionarDenuncia(denuncia.id);
    } else if (item) {
      selecionarDenuncia(Number(item.dataset.id));
    }
  });
```

- [ ] **Step 5: Verify in the browser**

Recarregar a página. Expected:
- Olímpia, Itanhaém e Viçosa: o mapa enquadra a área urbana, o contorno vermelho aparece, nenhum ponto cai no mar em Itanhaém, e os setores escurecem onde há mais denúncias abertas.
- Clicar numa denúncia da fila aumenta o ponto no mapa; clicar no ponto seleciona a linha da fila.
- "Agendar" e "Vistoriar" mudam a situação e a cor, e a vistoriada vai para o fim.
- A semana de pico mostra uma fila longa (até 60); a entressafra mostra uma fila curta.
- Voltar para a mesma semana mostra a mesma fila.
- Se algum retângulo urbano estiver mal colocado (pontos em área rural ou fora da cidade), ajustar `area_urbana` em `src/etl/exportar_simulador.py`, rodar a exportação de novo e incluir os JSON no commit.

- [ ] **Step 6: Run tests and commit**

Run: `node --test tests/js/*.test.mjs && uv run pytest tests -q && uv run ruff check src tests` → tudo PASS.

```bash
git add site/js/simulador/mapa.js site/simulador.html site/css/simulador.css site/js/simulador/main.js
git commit -m "feat: mapa e fila de denúncias simuladas

Refs #32"
```

---

### Task 7: Verificação final no navegador e no celular

**Files:**
- Modify (só se a verificação achar problema): os arquivos de `site/`

- [ ] **Step 1: Desktop.** Com o servidor rodando, conferir no Chrome, nos 3 municípios: última semana, "Maior pico", SE 1/2018 (previsão some, tendência diz "histórico curto"), uma semana de 2020. Console sem erros nem avisos de rede (fora tiles).
- [ ] **Step 2: Celular.** Redimensionar a janela para 390 × 844. Expected: sem rolagem horizontal; cards em 2 colunas; grades em 1 coluna; controle de semana na largura toda; mapa com 340 px; fila legível.
- [ ] **Step 3: Honestidade.** Conferir que todo painel simulado tem o selo "simulado", que a faixa amarela aparece no topo e que o rodapé tem a fonte, a data e o aviso da UBS.
- [ ] **Step 4: Testes.** `node --test tests/js/*.test.mjs && uv run pytest tests -q && uv run ruff check src tests` → tudo PASS.
- [ ] **Step 5: Commit das correções (se houver) e push**

```bash
git add site
git commit -m "fix: ajustes do simulador após verificação no navegador

Refs #32"
git push
```
