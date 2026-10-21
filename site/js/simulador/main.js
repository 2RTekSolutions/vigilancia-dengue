// Estado do simulador e ligação dos painéis.
import { carregarJSON, recortar, formatarData, NIVEIS } from "./dados.js";
import { tendencia, preverSazonal, faixaRisco, nivelPorCasos, correlacaoDefasada } from "./previsao.js";
import { desenharBarras, desenharPrevisao, desenharClima } from "./graficos.js";
import { gerarDenuncias, ordenarFila, proximaSituacao } from "./denuncias.js";
import { iniciarMapa, mostrarMunicipio, mostrarDenuncias, destacar, corDaSituacao } from "./mapa.js";

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
  const nivel = numero.format(Math.round(previsao.nivelRecente));
  canvas.setAttribute("aria-label", `Casos das últimas 12 semanas e projeção simulada das próximas 4: ${previsao.semanas.map((p) => Math.round(p.valor)).join(", ")} casos.`);
  $("previsao-nota").textContent =
    `Conta ilustrativa: parte da média das últimas 4 semanas (${nivel} casos) e segue o formato da mesma época nos anos anteriores, entre metade e o dobro. ` +
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

function renderizar() {
  const atual = semanaAtual();
  $("semana").value = estado.indice;
  $("semana-rotulo").textContent = `SE ${atual.se}/${atual.ano} · ${formatarData(atual.data)}`;
  const rec = recorteAtual();
  renderizarComoEstamos(rec);
  renderizarPrevisao(rec);
  renderizarClima(rec);
  renderizarDenuncias(rec);
}

async function trocarMunicipio(geocode) {
  estado.municipio = await carregarJSON(`${PASTA}/${geocode}.json`);
  const { nome, uf, semanas, fonte } = estado.municipio;
  $("titulo-municipio").textContent = `· ${nome}/${uf}`;
  document.title = `FAROL · ${nome}/${uf}`;
  $("semana").max = semanas.length - 1;
  $("rodape-fonte").textContent = fonte;
  $("rodape-data").textContent = formatarData(semanas.at(-1).data);
  estado.indice = semanas.length - 1;
  mostrarMunicipio(estado.municipio.contorno, estado.municipio.area_urbana);
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
  $("defasagem").addEventListener("input", (e) => {
    estado.defasagem = Number(e.target.value);
    $("defasagem-rotulo").textContent = `${estado.defasagem} semana${estado.defasagem === 1 ? "" : "s"}`;
    renderizarClima(recorteAtual());
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
