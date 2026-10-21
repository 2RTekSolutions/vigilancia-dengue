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
