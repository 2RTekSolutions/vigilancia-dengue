# Simulador do sistema da vigilância — design

Issue: #32. Data: 21/10/2026.

## Objetivo

Uma página que mostra como vai ser o sistema pronto (Fase 6) na tela de quem trabalha na Vigilância Epidemiológica. Serve para apresentar o projeto. Na segunda-feira, a vigilância abre o sistema e responde três perguntas, nesta ordem: *como estamos*, *o que vem aí* e *onde agir primeiro*.

**Sucesso:** alguém da vigilância olha a tela por um minuto e entende "isso me diria onde e quando agir". Funciona no notebook de quem apresenta e empilha no celular.

**Contexto decidido com a dupla em 21/10/2026:**
- Primeira etapa voltada à vigilância (agentes, Vigilância Epidemiológica, controle de vetores), não ao morador.
- Produto para qualquer município, não só Olímpia.
- Expansão futura para outras doenças (chikungunya e zika pelo InfoDengue; gripe/SRAG pelo InfoGripe). Fora do simulador agora.

## Municípios

| Município | Geocode IBGE |
| --- | --- |
| Olímpia/SP | 3533908 |
| Itanhaém/SP | 3522109 |
| Viçosa/MG | 3171303 |

Os três têm 458 semanas no InfoDengue (2018 a 2026), conferido em 21/10/2026.

## Tela

**Topo**
- Seletor de município.
- Seletor de semana de referência (ano + SE). Padrão: a última semana com dado.
- Faixa fixa: "SIMULADOR: casos e clima reais (InfoDengue); previsão, denúncias e mapa são simulados."

**1. Como estamos** (real)
- Cards: casos na semana, nível de alerta, Rt, tendência (casos das últimas 4 semanas contra as 4 anteriores).
- Barras semanais das últimas 52 semanas até a referência, coloridas pelo nível de alerta.

**2. O que vem aí** (simulado)
- Gráfico com as 12 semanas reais até a referência + 4 semanas projetadas, com faixa de incerteza.
- Risco previsto em cada semana projetada.
- Texto: a previsão real é entrega da Fase 6; aqui é uma conta sazonal simples.
- Painel de clima (real): dispersão de temperatura de N semanas atrás × casos, com controle deslizante de 0 a 10 semanas e a correlação de postos.

**3. Onde agir primeiro** (simulado)
- Mapa Leaflet + OpenStreetMap com o contorno do município e as denúncias como pontos.
- A área urbana é dividida em setores de grade (A1, A2…), coloridos pela quantidade de denúncias abertas. Nenhum nome de bairro inventado.
- Fila de denúncias por prioridade: tipo, idade em dias, setor, situação (nova → agendada → vistoriada). Clicar destaca no mapa; mudar a situação fica só na memória do navegador.

**Fora:** login, usuários, edição de dados, exportar relatório, mapa de casos por endereço (exigiria dado de paciente), visão do morador, outras doenças.

## Dados

`scripts/exportar_simulador.py` gera um JSON por município em `site/dados/simulador/<geocode>.json`, e um `municipios.json` com a lista.

Para cada município:
1. `extrair(geocode, 2018, ano_atual, "dengue")` → `transformar()` → `validar()` (ETL existente).
2. Contorno: API de malhas do IBGE (`/api/v3/malhas/municipios/{geocode}?formato=application/vnd.geo+json&qualidade=minima`).
3. Configuração manual: nome, UF e o retângulo da área urbana (sul, oeste, norte, leste), onde caem as denúncias.

Formato:

```json
{
  "geocode": 3533908,
  "nome": "Olímpia",
  "uf": "SP",
  "doenca": "dengue",
  "fonte": "InfoDengue (Fiocruz/FGV)",
  "atualizado_em": "2026-10-21",
  "populacao": 56037,
  "area_urbana": [-20.76, -48.93, -20.72, -48.88],
  "contorno": { "type": "FeatureCollection", "features": [] },
  "semanas": [
    {"data": "2018-01-07", "ano": 2018, "se": 1, "casos": 3,
     "temp": 25.1, "umid": 72.0, "rt": 0.9, "nivel": 1}
  ]
}
```

`temp`, `umid` e `rt` podem ser `null`. Acrescentar município = uma entrada na configuração do script.

## Contas

**Recorte:** com a semana de referência *r*, todo painel recebe só `semanas` até *r*, inclusive. Nada depois de *r* é lido, e a previsão nunca é comparada com o que aconteceu.

**Previsão sazonal (h = 1…4):**
- Para a SE alvo *s*, pegar os casos das SE *s*−1, *s* e *s*+1 em cada ano anterior ao da referência, dentro do recorte.
- Nível recente = média dos casos das últimas 4 semanas reais.
- Base recente = média das medianas sazonais dessas 4 semanas.
- Projeção = nível recente × (mediana do alvo + 1) / (base recente + 1), com a razão limitada a [0,5; 2].
- Faixa = a mesma conta com os percentis 25 (razão em [0,25; 2]) e 75 (razão em [0,5; 4]).
- Com menos de 2 anos anteriores, a previsão não aparece e o painel diz por quê.
- (Revisado em 21/10/2026: a primeira versão, mediana × ajuste limitado a 4, desabava no pico de uma epidemia maior que o histórico, por exemplo Itanhaém SE 16/2024, com 1.687 casos projetados para cerca de 104.)

**Faixa de risco (por município, para semanas projetadas):** calculada sobre todas as semanas do recorte. Abaixo da mediana = Baixo; até o percentil 75 = Atenção; até o 90 = Alerta; acima = Crítico. Não é o critério do InfoDengue, e o painel diz isso.

**Denúncias:**
- Gerador pseudoaleatório com semente = hash(geocode, ano, SE) (mulberry32).
- Quantidade = 4 + round(casos da semana de referência × 0,15), limitada a 60.
- Pontos uniformes no retângulo urbano, rejeitando os que caem fora do contorno.
- Tipo ponderado: terreno baldio, piscina abandonada, pneus, caixa d'água aberta, entulho, calha entupida, imóvel fechado.
- Idade 0–14 dias; situação inicial por idade (as mais velhas mais vezes "agendada").
- Prioridade = peso do tipo + idade + carga do setor.
- Setores: grade de 4×4 sobre o retângulo urbano; só aparecem os que têm denúncia.

## Código

HTML, CSS e JS com módulos ES, sem build. CDN: Chart.js 4 e Leaflet 1.9.

```
site/simulador.html
site/css/simulador.css
site/js/simulador/
  dados.js       carrega JSON, recorte até a referência
  previsao.js    previsão sazonal, faixa de risco, correlação com defasagem
  denuncias.js   gerador com semente, setores, prioridade
  graficos.js    Chart.js
  mapa.js        Leaflet
  main.js        estado (município, semana) e ligação dos painéis
site/dados/simulador/*.json
scripts/exportar_simulador.py
tests/js/*.test.mjs
tests/scripts/test_exportar_simulador.py
```

`previsao.js` e `denuncias.js` são puros (sem DOM), testáveis no Node.

## Testes

- `node --test tests/js/`: recorte não lê semana futura; previsão com dados conhecidos dá o valor esperado; previsão some com menos de 2 anos; faixa de risco nos limites; mesma semente gera a mesma fila; nenhuma denúncia fora do contorno; quantidade limitada.
- `pytest`: montagem do JSON com `extrair` e IBGE trocados por monkeypatch (padrão do projeto); `null` no lugar de NaN.
- Manual no Chrome: os 3 municípios, semanas de pico e de entressafra, celular (largura 390 px).

## Execução

`python -m http.server -d site` e abrir `/simulador.html`. A publicação no Pages é a issue #8.
