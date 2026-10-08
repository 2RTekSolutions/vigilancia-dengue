# Requisitos

Lista inicial, a validar com a organização parceira. A coluna Fase diz em que semestre o requisito entra.

## Funcionais

| Código | Requisito | Fase |
| --- | --- | --- |
| RF01 | Site apresenta a campanha de prevenção e os criadouros mais comuns | 1 |
| RF02 | Site mostra gráfico público de casos semanais da cidade | 1 |
| RF03 | Coletar InfoDengue e clima (INMET) toda semana, com agendamento | 2 |
| RF04 | Painel de casos, incidência e nível de alerta por semana | 2 |
| RF05 | Comparar Olímpia com cidades vizinhas | 2 |
| RF06 | Receber denúncia de criadouro com foto, local e tipo | 3 |
| RF07 | Fila de denúncias com estado (nova, vistoriada, resolvida, sem foco) | 3 |
| RF08 | Retorno ao morador quando a denúncia é atendida | 3 |
| RF09 | Mapa de denúncias por bairro | 4 |
| RF10 | Relatório por ciclo com denúncias, tempo de atendimento e tipos de criadouro | 4 |
| RF11 | App de denúncia com câmera e GPS | 5 |
| RF12 | Prever o nível de risco para as próximas semanas | 5–6 |
| RF13 | Versão desktop para o controle de vetores planejar a semana | 6 |

## Não funcionais

| Código | Requisito | Fase |
| --- | --- | --- |
| RNF01 | Site responsivo e acessível | 1 |
| RNF02 | Nenhum dado individual de paciente, em nenhuma fase | 1 |
| RNF03 | Coleta tolera fonte fora do ar e tenta de novo depois | 2 |
| RNF04 | Denúncia pode ser anônima; foto sem metadado (EXIF limpo) | 3 |
| RNF05 | Mapa público agrega por bairro, sem endereço exato | 4 |
| RNF06 | Comunicação com TLS; segredos em `.env` | 4 |
| RNF07 | Interface simples para morador e agente | 4 |
| RNF08 | Entrega automática por CI/CD | 5 |
| RNF09 | Previsão avaliada contra anos passados antes de uso | 6 |
| RNF10 | Testes automatizados e validação com o usuário | 6 |
