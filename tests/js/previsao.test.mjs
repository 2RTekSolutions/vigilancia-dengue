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

const perto = (valor, esperado) => assert.ok(Math.abs(valor - esperado) < 0.01, `${valor} != ${esperado}`);

test("preverSazonal parte do nível recente e segue o formato sazonal", () => {
  // Anos anteriores: 10 por semana em 2022 e 30 em 2023 -> mediana 20 em toda SE.
  // Últimas 4 semanas de 2024: 40 cada -> nível 40; formato plano -> razão 1.
  const semanas = serie({
    2022: repetir(10, 52),
    2023: repetir(30, 52),
    2024: repetir(40, 8),
  });
  const prev = preverSazonal(semanas);
  assert.equal(prev.nivelRecente, 40);
  assert.equal(prev.semanas.length, 4);
  assert.equal(prev.semanas[0].se, 9);
  perto(prev.semanas[0].valor, 40);
  perto(prev.semanas[0].inferior, 40 * (11 / 21));
  perto(prev.semanas[0].superior, 40 * (31 / 21));
});

test("preverSazonal acompanha a subida da época, limitada ao dobro", () => {
  // Base 10 nas SE 1-8 e 100 a partir da SE 9 -> razão (100+1)/(10+1) > 2 -> limita em 2.
  const ano = [...repetir(10, 8), ...repetir(100, 44)];
  const semanas = serie({ 2022: ano, 2023: ano, 2024: repetir(10, 7) });
  const prev = preverSazonal(semanas);
  assert.equal(prev.nivelRecente, 10);
  assert.ok(prev.semanas[1].valor <= 20 + 1e-9);
  assert.ok(prev.semanas[1].valor > 10);
});

test("preverSazonal não desaba no pico de uma epidemia", () => {
  // Histórico baixo e uma epidemia agora: a projeção fica perto do nível recente.
  const semanas = serie({
    2022: repetir(5, 52),
    2023: repetir(5, 52),
    2024: [10, 20, 40, 80, 300, 600, 900, 1600],
  });
  const prev = preverSazonal(semanas);
  assert.equal(prev.nivelRecente, 850);
  assert.ok(prev.semanas.every((p) => p.valor >= 850 * 0.5));
});

test("preverSazonal projeta zero quando a entressafra zera", () => {
  const semanas = serie({
    2022: repetir(10, 52),
    2023: repetir(30, 52),
    2024: repetir(0, 8),
  });
  const prev = preverSazonal(semanas);
  assert.ok(prev.semanas.every((p) => p.valor === 0 && p.inferior === 0 && p.superior === 0));
});

test("preverSazonal com base sazonal zero repete o nível recente", () => {
  const semanas = serie({
    2022: repetir(0, 52),
    2023: repetir(0, 52),
    2024: repetir(3, 8),
  });
  perto(preverSazonal(semanas).semanas[0].valor, 3);
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
