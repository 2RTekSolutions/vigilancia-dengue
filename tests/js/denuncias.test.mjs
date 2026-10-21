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
