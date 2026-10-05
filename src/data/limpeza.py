from typing import Optional
import pandas as pd


def limpar_e_salvar_dados_dengue(
    caminho_origem: str, caminho_destino: Optional[str] = None
) -> pd.DataFrame:
    """Carrega o CSV de dengue, extrai apenas as colunas essenciais para os gráficos

    (casos/semana, comparativo anual e distribuição de alertas) e salva no
    caminho de destino.
    """
    df = pd.read_csv(caminho_origem)

    # 1. Separar ano e semana epidemiológica
    df["ano"] = df["SE"] // 100
    df["semana_epidemiologica"] = df["SE"] % 100

    # 2. Converter data de início da semana
    df["data_inicio_semana"] = pd.to_datetime(df["data_iniSE"])

    # 3. Renomear colunas
    df = df.rename(columns={"casos": "casos_notificados", "nivel": "nivel_alerta"})

    # 4. Traduzir nível de alerta
    mapa_alerta = {
        1: "Verde (Baixo)",
        2: "Amarelo (Atenção)",
        3: "Laranja (Alerta)",
        4: "Vermelho (Crítico)",
    }
    df["nivel_alerta_desc"] = df["nivel_alerta"].map(mapa_alerta)

    # 5. Ordenar cronologicamente
    df = df.sort_values(
        by=["ano", "semana_epidemiologica"], ascending=True
    ).reset_index(drop=True)

    # 6. Filtrar as colunas estritamente necessárias
    colunas_finais = [
        "data_inicio_semana",
        "ano",
        "semana_epidemiologica",
        "casos_notificados",
        "nivel_alerta",
        "nivel_alerta_desc",
    ]
    df_filtrado = df[colunas_finais]

    # 7. Salvar diretamente no arquivo de saída, se informado
    if caminho_destino:
        df_filtrado.to_csv(caminho_destino, index=False)
        print(f"Arquivo salvo com sucesso em: {caminho_destino}")

    return df_filtrado


# Exemplo de uso:
if __name__ == "__main__":
    caminho_entrada = "data/raw/data_dengue.csv"
    caminho_saida = "data/processed/data_dengue_graficos.csv"

    df_limpo = limpar_e_salvar_dados_dengue(caminho_entrada, caminho_saida)
    print(df_limpo.head())
