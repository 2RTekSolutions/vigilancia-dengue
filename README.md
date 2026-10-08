# Vigilância Participativa da Dengue

Projeto de extensão do curso de Desenvolvimento de Software Multiplataforma (DSM) da Fatec Olímpia, do 1º semestre (2026-2) até a formatura (2029-1).

Um sistema aberto que prevê as semanas de maior risco de dengue em Olímpia, organiza as denúncias de criadouro feitas pela população e ajuda o controle de vetores a decidir onde ir primeiro. A dengue precisa ser combatida antes do pico, não depois.

## Grupo

| Nome | GitHub |
| --- | --- |
| Raquel Duarte | [@duartelab](https://github.com/duartelab) |
| Renan Croffi | [@ReCroffi](https://github.com/ReCroffi) |

## Problema

- A dengue volta todo ano no interior de SP, com picos no verão chuvoso. Em anos de epidemia, a rede de saúde lota.
- A maior parte dos criadouros fica dentro das casas e dos quintais, onde só o morador vê.
- O dado de casos chega com atraso e por semana epidemiológica. Quando o pico aparece na planilha, já passou da hora de agir.
- A denúncia de terreno com lixo ou piscina abandonada chega por telefone, sem foto nem endereço exato, e se perde.
- A campanha de conscientização costuma ser igual para a cidade toda, sem olhar onde o risco é maior.

## Objetivo

Entregar um sistema que:

- mostra casos e incidência por semana, com dado público agregado;
- prevê as semanas de maior risco com base em clima e histórico;
- recebe denúncia de criadouro com foto e GPS e organiza a fila para o controle de vetores;
- mostra no mapa onde há mais denúncia, para direcionar mutirão e campanha;

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
| 1º (2026-2) | Protótipo de site (Eng. de Software I) | Site da campanha de prevenção: criadouros comuns e gráfico de casos da cidade |
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
| Apresentação do projeto à coordenação do curso | 08/10/2026 |
| Envio do banner para impressão | 24/10/2026 |
| Feira de tecnologia da Fatec | 29/10/2026 |

## Organizações parceiras

A parceira proposta é a Prefeitura de Olímpia, pela Secretaria Municipal de Saúde, a Vigilância Epidemiológica e o controle de vetores. A coordenação do curso faz a ponte com a Prefeitura, e a parceria ainda será formalizada.

| Organização | Papel |
| --- | --- |
| Secretaria Municipal de Saúde / Vigilância Epidemiológica | Parceira proposta; valida o painel e as faixas de alerta |
| Controle de vetores / agentes de endemias | Usuário principal a partir da Fase 3 |
| UBS e agentes comunitários de saúde | Divulgação e denúncias em visita |
| Associações de bairro | Mutirão e divulgação |

## Dados

O projeto usa só dado público e agregado nas fases 1 e 2. No fim da Fase 2, o grupo decide se pede dado por bairro à Secretaria de Saúde, por canal formal.

| O que mede | Fonte | Granularidade |
| --- | --- | --- |
| Casos estimados, incidência e nível de alerta | [InfoDengue](https://info.dengue.mat.br/) (Fiocruz e FGV) | Semanal, por município |
| Casos notificados e confirmados | SINAN via DATASUS/TabNet | Semanal ou mensal, por município |
| Temperatura, umidade e chuva | INMET, estação automática mais próxima | Horária |
| População e bairros | IBGE (Censo e malhas) | Cadastro |
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
| Site (1º sem.) | HTML, CSS e JavaScript |
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

| Pasta | Conteúdo | Fase |
| --- | --- | --- |
| `site/` | Site da campanha de prevenção | 1 |
| `coleta/` | Coleta do InfoDengue e do INMET | 2 |
| `api/` | API do sistema | 2 em diante |
| `analise/` | Séries temporais e previsão de risco | 2 em diante |
| `painel/` | Painel web | 2 em diante |
| `app/` | Aplicativo de denúncia | 5 |
| `docs/` | Atas, requisitos, banner e relatórios de extensão | todas |

Requisitos: [docs/requisitos.md](docs/requisitos.md). Banner da feira: [docs/banner.md](docs/banner.md).

## Como trabalhamos

- `main`: só o que foi entregue. Cada fim de fase vira uma tag (ex.: `v1.0-fase1`).
- `develop`: onde o trabalho se junta. Precisa estar sempre funcionando.
- `feature/<issue>-<descricao>`: um ramo por tarefa, nasce de `develop` e volta por pull request.
- Todo PR tem `Closes #n` na descrição e é revisado pela outra pessoa do grupo.
- Prefixos de commit: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`.
- Nunca subir senha ou dado real: use `.env` (copiado de `.env.example`).

O quadro de tarefas fica no [GitHub Projects da 2RTekSolutions](https://github.com/orgs/2RTekSolutions/projects/1).
