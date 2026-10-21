# FAROL · Vigilância da Dengue

**F**erramenta de **A**ntecipação de **R**isco e **O**rientação **L**ocal.

Projeto de extensão do curso de Desenvolvimento de Software Multiplataforma (DSM) da Fatec Olímpia, do 1º semestre (2026-2) até a formatura (2029-1).

Um sistema aberto para a vigilância epidemiológica de qualquer município: mostra como está a dengue na semana, prevê as semanas de maior risco e organiza as denúncias de criadouro para o controle de vetores decidir onde ir primeiro. A dengue precisa ser combatida antes do pico, não depois.

**Site:** https://2rteksolutions.github.io/vigilancia-dengue/ · **Simulador:** https://2rteksolutions.github.io/vigilancia-dengue/simulador.html

O simulador mostra como vai ser o sistema pronto, com Olímpia/SP, Itanhaém/SP e Viçosa/MG. Casos e clima são reais (InfoDengue); previsão, denúncias e mapa são simulados.

## Grupo

| Nome | GitHub |
| --- | --- |
| Raquel Duarte | [@duartelab](https://github.com/duartelab) |
| Renan Croffi | [@ReCroffi](https://github.com/ReCroffi) |

## Problema

- A dengue volta todo ano, com o pico entre fevereiro e maio. Em anos de epidemia, a rede de saúde lota.
- O tamanho da epidemia muda muito de um ano para outro: em Olímpia foram 366 casos em 2018 e 9.369 em 2024. Repetir o plano do ano passado não funciona.
- O dado de casos chega com atraso e por semana epidemiológica. Quando o pico aparece na planilha, já passou da hora de agir.
- A denúncia de terreno com lixo ou piscina abandonada chega por telefone, sem foto nem endereço exato, e a equipe de campo não tem como decidir onde ir primeiro.
- O problema é o mesmo em cidades diferentes, e as cidades pequenas não têm ferramenta própria.

## Objetivo

Entregar um sistema que, para qualquer município com dado público:

- mostra casos, nível de alerta e Rt por semana (**como estamos**);
- prevê as semanas de maior risco com base no histórico, no Rt e no clima (**o que vem aí**);
- recebe denúncia de criadouro com foto e GPS e organiza a fila e o mapa para o controle de vetores (**onde agir primeiro**).

### Fora de escopo

- Dado individual de paciente (nome, endereço, notificação nominal). Nunca.
- Diagnóstico ou orientação médica. O sistema orienta procurar a UBS.
- Substituir o sistema oficial de vigilância ou o boletim da Secretaria de Saúde.
- Aplicação de inseticida ou qualquer ação de campo pelo grupo.
- Ações presenciais de educação (escolas, gincanas, palestras). O projeto é só software.

## Fases

Uma fase por semestre. Cada fase fecha com a entrega de extensão do PPC (300 h no total). As fases 4 a 6 formam o Portfólio Digital, que substitui o TG.

| Semestre | Entrega do PPC | O que o projeto entrega |
| --- | --- | --- |
| 1º (2026-2) | Protótipo de site (Eng. de Software I) | Site do FAROL (por que este projeto, com os dados) e simulador do sistema da vigilância |
| 2º (2027-1) | Sistema web Python/PHP + SQL, UML | Coleta semanal do InfoDengue e do INMET, painel de casos |
| 3º (2027-2) | App web com Scrum/Kanban e NoSQL | Denúncias com foto em NoSQL, fila do controle de vetores |
| 4º (2028-1) | Aplicação web com foco em UX | Mapa por bairro testado com agentes e moradores |
| 5º (2028-2) | App com banco e sensores, CI/CD | App de denúncia com câmera e GPS |
| 6º (2029-1) | Sistema web, mobile e desktop, V&V | Desktop da vigilância, previsão de risco validada |

A denúncia precisa estar pronta antes das chuvas de fim de ano (Fase 3). Cada pico de verão vira dado de teste.

## Marcos

| Marco | Data |
| --- | --- |
| Escolha do tema | 01/10/2026 (feito) |
| Apresentação do projeto à coordenação do curso | 08/10/2026 (feito) |
| Site e simulador publicados no GitHub Pages | 21/10/2026 (feito) |
| Feira de tecnologia da Fatec (pitch de 1 minuto) | 29/10/2026 |

## Público-alvo

O projeto não tem organização parceira: a ideia é que vire um produto real, e o professor liberou a extensão sem parceira. Nesta primeira etapa, o foco é quem trabalha na vigilância. O morador entra a partir da Fase 3, com a denúncia.

| Quem | Como usa |
| --- | --- |
| Vigilância Epidemiológica | Painel de casos, nível de alerta e previsão de risco |
| Controle de vetores / agentes de endemias | Fila de denúncias e mapa por setor |
| Moradores (a partir da Fase 3) | Denunciam criadouros e consultam o risco da semana |
| UBS, agentes comunitários e associações de bairro | Divulgação, denúncias em visita e mutirões |

## Dados

O projeto usa só dado público e agregado nas fases 1 e 2, e funciona para qualquer município pelo código do IBGE. No fim da Fase 2, o grupo decide se pede dado por bairro à Secretaria de Saúde, por canal formal.

| O que mede | Fonte | Granularidade |
| --- | --- | --- |
| Casos estimados, incidência e nível de alerta | [InfoDengue](https://info.dengue.mat.br/) (Fiocruz e FGV) | Semanal, por município |
| Casos notificados e confirmados | SINAN via DATASUS/TabNet | Semanal ou mensal, por município |
| Temperatura, umidade e chuva | INMET, estação automática mais próxima | Horária |
| População e contorno do município | IBGE (estimativas, Censo e malhas) | Anual / cadastro |
| Denúncias de criadouro | O próprio sistema | Por caso |

### Privacidade (LGPD)

- Dado de saúde é dado pessoal sensível. O sistema nunca recebe dado individual de paciente, em nenhuma fase.
- A denúncia pode ser anônima, e a foto perde os metadados (EXIF).
- O mapa público agrega por bairro. O endereço exato só aparece para o agente que vai vistoriar.
- O painel é apoio, não boletim oficial, e aponta para o boletim da Secretaria de Saúde.
- Nada do estágio na prefeitura entra neste projeto: nem dado, nem planilha, nem acesso.

## Tecnologias previstas

| Camada | Tecnologia |
| --- | --- |
| Site (1º sem.) | HTML, CSS e JavaScript (nível Dev Web I) |
| Simulador (1º sem.) | JavaScript com módulos, Chart.js e Leaflet |
| Coleta | Python com agendamento semanal |
| API | Python com FastAPI |
| Banco relacional | PostgreSQL |
| Banco não relacional (3º sem.) | MongoDB |
| Análise | pandas, statsmodels, scikit-learn |
| Mapa | Leaflet + OpenStreetMap |
| App | React Native (Expo) |
| Desktop (6º sem.) | Electron ou Tauri |
| Entrega | Docker e GitHub Actions |

## Estrutura do repositório

| Pasta | Conteúdo |
| --- | --- |
| `site/` | Site do FAROL (`index`, `dados`, `proposta`, `sobre`) e o simulador (`simulador.html`, `js/simulador/`, `dados/simulador/`) |
| `src/etl/` | ETL: extração do InfoDengue e do IBGE, transformação e validação, exportação dos dados do simulador |
| `tests/` | Testes do ETL (pytest) e das contas do simulador (Node) |
| `notebooks/` | Análises exploratórias |
| `data/` | Dados brutos e processados |
| `docs/` | Requisitos, pitch, design e plano do simulador |
| `.github/workflows/` | Publicação do site no GitHub Pages |

Pastas previstas para as próximas fases: API, coleta agendada, painel e app.

Requisitos: [docs/requisitos.md](docs/requisitos.md). Pitch de 1 minuto: [docs/pitch.md](docs/pitch.md). Design do simulador: [docs/superpowers/specs/2026-10-21-simulador-design.md](docs/superpowers/specs/2026-10-21-simulador-design.md).

## Como rodar

```bash
uv sync                                          # dependências do Python
python -m http.server -d site                    # site e simulador em localhost:8000
PYTHONPATH=src uv run python -m etl.exportar_simulador   # atualiza os dados do simulador
uv run pytest                                    # testes do ETL
node --test tests/js/                            # testes do simulador
```

O site precisa de um servidor (o comando acima): aberto direto pelo arquivo, o navegador bloqueia a leitura dos dados. Cada merge na `develop` que mexe em `site/` publica o site de novo no GitHub Pages.

## Banco de dados

O ETL grava num PostgreSQL 17 que roda no container `dengue-db` do homelab. O banco não fica exposto na internet nem na rede de casa.

| Item | Valor |
| --- | --- |
| Host | `10.114.66.23` (rede interna do homelab) |
| Porta | `5432` |
| Banco | `dengue` |
| Usuário | `dengue_etl` |
| Senha | no `.env` local; nunca no repositório |

Quem pode conectar: o container `dengue` (onde o ETL roda) e o próprio homelab. Da máquina de desenvolvimento, a conexão passa por um túnel SSH pelo homelab, que exige acesso SSH a ele.

Para conectar do desktop ou do notebook:

1. Copie `.env.example` para `.env` e preencha `PGPASSWORD`.
2. Abra o túnel e deixe o terminal aberto: `ssh -N -L 5433:10.114.66.23:5432 homelab`.
3. Em outro terminal, na raiz do repositório: `set -a && source .env && set +a && psql`.

As variáveis do `.env` (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`) são as que o `psql` e o `psycopg` leem sozinhos. No container `dengue`, o `.env` usa `PGHOST=10.114.66.23` e `PGPORT=5432`.

## Como trabalhamos

- `main`: só o que foi entregue. Cada fim de fase vira uma tag (ex.: `v1.0-fase1`).
- `develop`: onde o trabalho se junta. Precisa estar sempre funcionando.
- `feature/<issue>-<descricao>`: um ramo por tarefa, nasce de `develop` e volta por pull request.
- Todo PR tem `Closes #n` na descrição e é revisado pela outra pessoa do grupo.
- Prefixos de commit: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`.
- Nunca subir senha ou dado real: use `.env` (copiado de `.env.example`).

O quadro de tarefas fica no [GitHub Projects da 2RTekSolutions](https://github.com/orgs/2RTekSolutions/projects/1).
