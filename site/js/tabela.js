// Monta a tabela de casos por ano e as frases de comparação.
// Usa as variáveis "anos" e "cidades" do arquivo numeros.js.

const corpoTabela = document.getElementById("corpo-tabela");
const listaComparacoes = document.getElementById("comparacoes");

// Escreve o número no formato brasileiro (9.369 em vez de 9369).
function formatar(numero) {
    return numero.toLocaleString("pt-BR");
}

// Descobre a posição do maior valor de uma lista.
function posicaoDoMaior(lista) {
    let posicao = 0;
    for (let i = 1; i < lista.length; i++) {
        if (lista[i] > lista[posicao]) {
            posicao = i;
        }
    }
    return posicao;
}

// Descobre a posição do menor valor, sem contar o último ano (que ainda não terminou).
function posicaoDoMenor(lista) {
    let posicao = 0;
    for (let i = 1; i < lista.length - 1; i++) {
        if (lista[i] < lista[posicao]) {
            posicao = i;
        }
    }
    return posicao;
}

// Uma linha da tabela para cada ano.
for (let i = 0; i < anos.length; i++) {
    const linha = document.createElement("tr");

    const celulaAno = document.createElement("td");
    celulaAno.textContent = anos[i];
    linha.appendChild(celulaAno);

    for (let c = 0; c < cidades.length; c++) {
        const celula = document.createElement("td");
        celula.textContent = formatar(cidades[c].casos[i]);
        if (i === posicaoDoMaior(cidades[c].casos)) {
            celula.className = "maior";
        }
        linha.appendChild(celula);
    }

    corpoTabela.appendChild(linha);
}

// Uma frase por cidade: quantas vezes o pior ano foi maior que o mais calmo.
for (let c = 0; c < cidades.length; c++) {
    const casos = cidades[c].casos;
    const maior = posicaoDoMaior(casos);
    const menor = posicaoDoMenor(casos);
    const vezes = Math.round(casos[maior] / casos[menor]);

    const item = document.createElement("li");
    item.textContent = cidades[c].nome + ": " + formatar(casos[menor]) + " casos em " + anos[menor] +
        " e " + formatar(casos[maior]) + " em " + anos[maior] + ", cerca de " + vezes + " vezes mais.";
    listaComparacoes.appendChild(item);
}
