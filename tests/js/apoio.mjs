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
