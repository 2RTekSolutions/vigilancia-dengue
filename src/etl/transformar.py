import pandas as pd
import pandera.pandas as pa


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


def validar(df: pd.DataFrame) -> pd.DataFrame:
    """Valida o DataFrame transformado usando Pandera.

    Args:
        df (pd.DataFrame): DataFrame transformado.

    Raises:
        ValueError: Se o DataFrame não atender ao esquema definido.

    Returns:
        pd.DataFrame: DataFrame validado.
    """
    esquema = pa.DataFrameSchema(
        {
            "data_inicio_semana": pa.Column(
                pd.Timestamp,
                checks=pa.Check(lambda x: x.dt.dayofweek == 6),
                nullable=False,
            ),
            "ano": pa.Column(int, checks=pa.Check.ge(2010), nullable=False),
            "semana_epidemiologica": pa.Column(
                int, checks=pa.Check.in_range(1, 53), nullable=False
            ),
            "casos_notificados": pa.Column(int, checks=pa.Check.ge(0), nullable=False),
            "temperatura_media": pa.Column(
                float, checks=pa.Check.in_range(-50, 80), nullable=True
            ),
            "umidade_media": pa.Column(
                float, checks=pa.Check.in_range(0, 100), nullable=True
            ),
            "taxa_reproducao_rt": pa.Column(
                float, checks=pa.Check.ge(0), nullable=True
            ),
            "nivel_alerta": pa.Column(
                int, checks=pa.Check.in_range(1, 4), nullable=False
            ),
            "nivel_alerta_desc": pa.Column(
                str,
                checks=pa.Check.isin(
                    [
                        "Verde (Baixo)",
                        "Amarelo (Atenção)",
                        "Laranja (Alerta)",
                        "Vermelho (Crítico)",
                    ]
                ),
                nullable=False,
            ),
            "geocode": pa.Column(
                int,
                checks=pa.Check.in_range(1000000, 9999999),
                nullable=False,
            ),
            "populacao": pa.Column(int, checks=pa.Check.gt(0), nullable=False),
        },
        unique=["semana_epidemiologica", "geocode", "ano"],
    )
    try:
        return esquema.validate(df, lazy=True)
    except pa.errors.SchemaErrors as e:
        raise ValueError(
            f"Validação do DataFrame falhou: {e.failure_cases.to_string()}"
        ) from e
