# Requisitos

Lista inicial, a validar com os usuários: a Vigilância Epidemiológica e o controle de vetores (agentes de endemias) e, a partir da Fase 3, os moradores. O FAROL serve para qualquer município que tenha dado público. A coluna Fase diz em que semestre o requisito entra.

## Funcionais

| Código | Requisito | Fase |
| --- | --- | --- |
| RF01 | Site explica o problema e a proposta do FAROL com dados públicos: a dengue volta todo ano, o tamanho muda, o Rt sobe antes do pico | 1 (feito) |
| RF02 | Site mostra os casos por ano de mais de um município e os gráficos do painel (Power BI) | 1 |
| RF03 | Coletar InfoDengue e clima (INMET) toda semana, com agendamento | 2 |
| RF04 | Painel de casos, incidência, nível de alerta e Rt por semana | 2 |
| RF05 | Escolher o município pelo código do IBGE e comparar municípios | 2 |
| RF06 | Receber denúncia de criadouro com foto, local e tipo | 3 |
| RF07 | Fila de denúncias por prioridade, com estado (nova, agendada, vistoriada, resolvida, sem foco) | 3 |
| RF08 | Retorno ao morador quando a denúncia é atendida | 3 |
| RF09 | Mapa de denúncias por setor ou bairro | 4 |
| RF10 | Relatório por ciclo com denúncias, tempo de atendimento e tipos de criadouro | 4 |
| RF11 | App de denúncia com câmera e GPS | 5 |
| RF12 | Prever o nível de risco para as próximas semanas | 5–6 |
| RF13 | Versão desktop para o controle de vetores planejar a semana | 6 |
| RF14 | Simulador do sistema pronto, na visão da vigilância: como estamos, o que vem aí e onde agir primeiro | 1 (feito) |

## Não funcionais

| Código | Requisito | Fase |
| --- | --- | --- |
| RNF01 | Site responsivo e acessível | 1 |
| RNF02 | Nenhum dado individual de paciente, em nenhuma fase | 1 |
| RNF03 | Coleta tolera fonte fora do ar e tenta de novo depois | 2 |
| RNF04 | Denúncia pode ser anônima; foto sem metadado (EXIF limpo) | 3 |
| RNF05 | Mapa público agrega por setor ou bairro, sem endereço exato | 4 |
| RNF06 | Comunicação com TLS; segredos em `.env` | 4 |
| RNF07 | Interface simples para agente e morador | 4 |
| RNF08 | Entrega automática por CI/CD | 5 |
| RNF09 | Previsão avaliada contra anos passados antes de uso | 6 |
| RNF10 | Testes automatizados e validação com o usuário | 6 |
| RNF11 | Todo dado simulado ou ilustrativo aparece marcado como simulado na tela | 1 |
| RNF12 | Nenhuma cidade fixa no código: município, estação e área por configuração | 1 |
