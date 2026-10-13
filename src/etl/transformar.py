import pandas as pd


def transformar(df_bruto: pd.DataFrame, geocode: int) -> pd.DataFrame:
    """Transforma os dados de dengue extraídos do InfoDengue.

    Args:
        df_bruto (pd.DataFrame): DataFrame contendo os dados extraídos.
        geocode (int): Código IBGE do município.

    Returns:
        pd.DataFrame: DataFrame transformado.
    """
    colunas_necessarias = {
        "SE",
        "data_iniSE",
        "casos",
        "nivel",
        "tempmed",
        "umidmed",
        "Rt",
        "pop",
    }
    faltantes = colunas_necessarias - set(df_bruto.columns)
    if faltantes:
        raise ValueError(f"Colunas obrigatorias ausentes: {sorted(faltantes)}")
    df = df_bruto.copy()
    df["geocode"] = geocode
    df["ano"] = df["SE"] // 100
    df["semana_epidemiologica"] = df["SE"] % 100
    df["data_inicio_semana"] = pd.to_datetime(df["data_iniSE"])
    mapa_colunas = {
        "casos": "casos_notificados",
        "nivel": "nivel_alerta",
        "tempmed": "temperatura_media",
        "umidmed": "umidade_media",
        "Rt": "taxa_reproducao_rt",
        "pop": "populacao",
    }
    df = df.rename(columns=mapa_colunas)
    mapa_alerta = {
        1: "Verde (Baixo)",
        2: "Amarelo (Atenção)",
        3: "Laranja (Alerta)",
        4: "Vermelho (Crítico)",
    }
    df["nivel_alerta_desc"] = df["nivel_alerta"].map(mapa_alerta)
    df = df.sort_values(
        by=["ano", "semana_epidemiologica"], ascending=True
    ).reset_index(drop=True)

    colunas_finais = [
        "data_inicio_semana",
        "ano",
        "semana_epidemiologica",
        "casos_notificados",
        "temperatura_media",
        "umidade_media",
        "taxa_reproducao_rt",
        "nivel_alerta",
        "nivel_alerta_desc",
        "geocode",
        "populacao",
    ]

    return df[colunas_finais]
