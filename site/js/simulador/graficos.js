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
          borderColor: "#1d63b8",
          backgroundColor: "#1d63b8",
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

export function desenharClima(canvas, pontos) {
  const maximo = Math.max(1, ...pontos.map((p) => p.casos));
  trocar(canvas, {
    type: "bubble",
    data: {
      datasets: [
        {
          data: pontos.map((p) => ({ x: p.x, y: p.y, r: 3 + 17 * Math.sqrt(p.casos / maximo), se: p.se, casos: p.casos })),
          backgroundColor: "rgb(29 99 184 / 0.45)",
          borderColor: "#ffffff",
          borderWidth: 1,
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
            label: (item) => [
              `Semana ${item.raw.se} do ano`,
              `Umidade média ${item.raw.x.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`,
              `Temperatura média ${item.raw.y.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} °C`,
              `Maior nº de casos: ${numero.format(item.raw.casos)}`,
            ],
          },
        },
      },
      scales: {
        x: { title: { display: true, text: "Umidade média (%)" }, grid: { color: "#eef0f2" }, border: { display: false } },
        y: { title: { display: true, text: "Temperatura média (°C)" }, grid: { color: "#eef0f2" }, border: { display: false } },
      },
    },
  });
}
