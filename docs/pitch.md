# Pitch de 1 minuto

Pitch do FAROL para a feira de tecnologia da Fatec (29/10/2026). São duas falas de uns 30 segundos: a Kell abre com o problema e o que é o FAROL, e o Renan fecha com a parte técnica: de onde vêm os dados, o que já foi feito e o convite.

## Como usar

- **Deixa de passagem:** a Kell termina em "onde agir primeiro" e olha para o Renan. Ele começa sem esperar pergunta.
- **Tempo:** cada fala tem perto de 70 palavras, o que dá uns 30 segundos em ritmo calmo. Se o cronômetro passar de 35 segundos, cortem a frase marcada como *(opcional)*.
- **Não decorem palavra por palavra.** Decorem a ordem das ideias e os dois números (366 e mais de 9 mil). O resto pode sair com as palavras de vocês.
- **Enquanto o Renan fala do simulador, a Kell mostra a tela.** A fala funciona melhor apontando para algo real.

## Fala da Kell (abre, uns 30 s)

> Todo ano a dengue volta, mas nunca do mesmo tamanho. Em Olímpia foram **366 casos em 2018 e mais de 9 mil em 2024**. E o dado chega por semana e com atraso: quando o pico aparece no boletim, a transmissão já aconteceu. Por isso criamos o **FAROL**, um sistema aberto para a vigilância epidemiológica de qualquer município. Ele responde três perguntas: **como estamos, o que vem aí e onde agir primeiro.**

O nome por extenso (Ferramenta de Antecipação de Risco e Orientação Local) fica de fora da fala para não quebrar o ritmo. Ele entra se alguém perguntar o que significa a sigla.

## Fala do Renan (fecha, uns 30 s)

> Tudo isso com **dado público**: os casos e o clima vêm do InfoDengue e a população vem do IBGE, **sem nenhum dado de paciente**. Neste semestre escrevemos em Python a extração e a limpeza desses dados, fizemos o site, que mostra com os números por que o problema importa, e um **simulador** de como o sistema vai funcionar, com Olímpia, Itanhaém e Viçosa. *(opcional: Até 2029 vêm a coleta automática, as denúncias com foto, o app e a previsão de risco validada.)* **Aponta o celular no QR code e testa o simulador.**

O simulador mostra como o sistema vai funcionar, mas ainda não é o sistema. Por isso a fala diz "simulador de como vai funcionar" e não "sistema pronto".

## Perguntas prováveis

As perguntas estão em ordem de chance de aparecer. As técnicas ficam com o Renan, as de contexto e uso ficam com a Kell. A regra de ouro: quando não souber, digam "ainda não sabemos, é uma das etapas" em vez de inventar.

| # | Pergunta | Quem | Resposta curta |
| --- | --- | --- | --- |
| 1 | O que o FAROL faz que o InfoDengue não faz? | Kell | O InfoDengue é a fonte, feito para pesquisa e para o país todo. O FAROL é a camada de decisão do município: junta casos, clima e denúncias numa tela e mostra onde agir primeiro. |
| 2 | Vocês já preveem o pico? | Renan | Ainda não. O simulador usa uma estimativa simples: o nível das últimas 4 semanas ajustado pelo padrão de cada época do ano. A previsão validada é meta para 2029. |
| 3 | O que significa FAROL? | Kell | Ferramenta de Antecipação de Risco e Orientação Local. |
| 4 | Quem vai usar? | Kell | A vigilância epidemiológica e o controle de vetores do município. O morador entra depois, com a denúncia, no 3º semestre. |
| 5 | E a LGPD? | Kell | Não usamos dado de paciente. Tudo é público e agregado por semana e por município. |
| 6 | Por que Olímpia, Itanhaém e Viçosa? | Kell | Olímpia é a nossa cidade. Itanhaém (litoral de SP) e Viçosa (MG) são de outras regiões e tamanhos e mostram que o sistema serve para qualquer município. |
| 7 | O clima prevê a dengue? | Renan | Ajuda como contexto, mas não prevê sozinho. Nos 10% de semanas com mais casos em Olímpia, a média foi 24,7 °C e 67% de umidade, contra 23,8 °C e 61% no geral. A correlação da temperatura com os casos é fraca, perto de 0,25. |
| 8 | O que é esse Rt? | Renan | Quantas pessoas, em média, cada infectado contamina. Acima de 1, a epidemia cresce. Em Olímpia ele passou de 1 de 13 a 17 semanas antes do pico nos anos de epidemia, mas também passa em anos calmos, então sozinho não basta. |
| 9 | Como os dados chegam? | Renan | Um ETL em Python baixa os dados da API do InfoDengue e do IBGE, limpa e valida. O banco PostgreSQL já está montado e a carga é o próximo passo. Hoje roda na mão; a coleta semanal automática é do 2º semestre. |
| 10 | Quais tecnologias vocês usaram? | Renan | Python com pandas e pandera no ETL, PostgreSQL em container, site em HTML, CSS e JavaScript, simulador com Chart.js e Leaflet, publicado no GitHub Pages. Os gráficos são do Power BI. |
| 11 | O mapa mostra denúncias reais? | Renan | Não. As denúncias do simulador são fictícias, só para mostrar a tela. Denúncia real com foto é do 3º semestre, e o mapa por bairro é do 4º. |
| 12 | O dado de casos atrasa. Como vocês lidam? | Renan | Hoje usamos os casos notificados, que chegam com atraso. O InfoDengue também publica uma estimativa que corrige parte desse atraso, e avaliar o uso dela é um próximo passo possível. |
| 13 | Por que a dengue muda tanto de um ano para o outro? | Kell | É uma mistura de clima, do tipo de vírus que circula e de quanta gente já pegou antes. Por isso olhar só o ano anterior engana. |
| 14 | Isso vai virar produto? Quanto custa? | Kell | Por enquanto é projeto de extensão, aberto. Se virar produto, o cliente seria a prefeitura. |
| 15 | Qual foi a maior dificuldade? | Os dois | Respondam com algo real de vocês. Um exemplo do Renan: 11 semanas sem dado de temperatura e umidade, e a decisão de não inventar valor para elas. |

## Checklist da feira

- [ ] QR code do site ([2rteksolutions.github.io/vigilancia-dengue](https://2rteksolutions.github.io/vigilancia-dengue/)) impresso e salvo no celular
- [ ] Notebook com o simulador aberto em Olímpia, no pico de 2024 (SE 18)
- [ ] Plano B sem internet: os PDFs de wireframes e mockups ([design/](design/)) baixados no notebook, porque o simulador carrega o mapa e os gráficos da internet
- [ ] Ensaio cronometrado: três vezes juntos, com o total abaixo de 1 min 05 s
- [ ] Respostas 1, 2 e 7 ensaiadas em voz alta, porque são as que mais pegam
- [ ] Bateria do notebook e do celular cheia
