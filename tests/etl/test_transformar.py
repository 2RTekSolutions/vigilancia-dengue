import pandas as pd
import pytest

from etl.transformar import completar_populacao, transformar, validar

DADOS_VALIDOS = {
    "data_inicio_semana": pd.to_datetime(["2024-01-07", "2024-01-14"]),
    "ano": [2024, 2024],
    "semana_epidemiologica": [2, 3],
    "casos_notificados": [10, 20],
    "temperatura_media": [25.0, 26.0],
    "umidade_media": [70.0, 80.0],
    "taxa_reproducao_rt": [1.1, 1.2],
    "nivel_alerta": [1, 2],
    "nivel_alerta_desc": ["Verde (Baixo)", "Amarelo (Atenção)"],
    "geocode": [3533908, 3533908],
    "populacao": [55000, 55000],
}

BASE_POP = {
    "ano": [2020, 2022],
    "populacao": [100, 200],
    "geocode": [3533908, 3533908],
    "fonte": ["estimativa", "estimativa"],
}


def test_colunas_ausente_gera_erro():
    df = pd.DataFrame(
        columns=[
            "SE",
            "data_iniSE",
            "nivel",
            "tempmed",
            "umidmed",
            "Rt",
            "pop",
        ]
    )

    with pytest.raises(ValueError, match="casos"):
        transformar(df, 3533908)


def test_transforma_e_ordena_dados():
    df = pd.DataFrame(
        {
            "SE": [202402, 202401],
            "data_iniSE": ["2024-01-07", "2023-12-31"],
            "casos": [20, 10],
            "nivel": [2, 1],
            "tempmed": [26.0, 25.0],
            "umidmed": [80.0, 70.0],
            "Rt": [1.2, 1.1],
            "pop": [55000, 55000],
        }
    )
    original = df.copy(deep=True)

    resultado = transformar(df, 3533908)

    assert resultado["ano"].tolist() == [2024, 2024]
    assert resultado["semana_epidemiologica"].tolist() == [1, 2]
    assert resultado["casos_notificados"].tolist() == [10, 20]
    assert resultado["geocode"].tolist() == [3533908, 3533908]
    assert resultado["populacao"].tolist() == [55000, 55000]
    assert resultado["nivel_alerta_desc"].tolist() == [
        "Verde (Baixo)",
        "Amarelo (Atenção)",
    ]
    pd.testing.assert_frame_equal(df, original)


def test_clima_nulo_nao_impede_transformacao():
    df = pd.DataFrame(
        {
            "SE": [202402, 202401],
            "data_iniSE": ["2024-01-07", "2023-12-31"],
            "casos": [20, 10],
            "nivel": [2, 1],
            "tempmed": [None, None],
            "umidmed": [None, None],
            "Rt": [1.2, 1.1],
            "pop": [55000, 55000],
        }
    )

    resultado = transformar(df, 3533908)

    assert resultado["temperatura_media"].isnull().all()
    assert resultado["umidade_media"].isnull().all()


def test_transformar_converte_datas():
    df = pd.DataFrame(
        {
            "SE": [202402, 202401],
            "data_iniSE": ["2024-01-07", "2023-12-31"],
            "casos": [20, 10],
            "nivel": [2, 1],
            "tempmed": [26.0, 25.0],
            "umidmed": [80.0, 70.0],
            "Rt": [1.2, 1.1],
            "pop": [55000, 55000],
        }
    )

    resultado = transformar(df, 3533908)

    assert pd.api.types.is_datetime64_any_dtype(resultado["data_inicio_semana"])
    assert resultado["data_inicio_semana"].tolist() == [
        pd.Timestamp("2023-12-31"),
        pd.Timestamp("2024-01-07"),
    ]


def test_validar_exige_inicio_da_semana_no_domingo():
    df = pd.DataFrame(DADOS_VALIDOS)
    df["data_inicio_semana"] = pd.to_datetime(["2024-01-07", "2024-01-08"])

    with pytest.raises(ValueError, match="data_inicio_semana"):
        validar(df)


def test_validar_aceita_dados_validos():
    df = pd.DataFrame(DADOS_VALIDOS)
    resultado = validar(df)
    pd.testing.assert_frame_equal(resultado, df)


def test_validar_nao_aceita_SE_54():
    df = pd.DataFrame(DADOS_VALIDOS)
    df.loc[0, "semana_epidemiologica"] = 54
    with pytest.raises(ValueError, match="semana_epidemiologica"):
        validar(df)


def test_validar_nao_aceita_duplicatas():
    df = pd.DataFrame(DADOS_VALIDOS)
    df = pd.concat([df, df.iloc[[0]]], ignore_index=True)
    with pytest.raises(ValueError, match="multiple_fields_uniqueness"):
        validar(df)


def test_completar_populacao_retorna_erro_ano_fora_intervalo_valido():
    df_pop = pd.DataFrame(BASE_POP)
    with pytest.raises(ValueError, match="2019"):
        completar_populacao(df_pop, [2019, 2025])
    with pytest.raises(ValueError, match="2025"):
        completar_populacao(df_pop, [2022, 2025])


def test_completar_populacao_interpolacao_calcula_corretamente():
    df_pop = pd.DataFrame(BASE_POP)
    anos = [2021]
    populacao_interpolada = completar_populacao(df_pop, anos)
    assert populacao_interpolada["populacao"].tolist() == [150]
    assert populacao_interpolada["ano"].tolist() == [2021]
    assert populacao_interpolada["fonte"].tolist() == ["interpolado"]


def test_completar_populacao_interpolacao_mantem_anos_existentes():
    df_pop = pd.DataFrame(BASE_POP)
    anos = [2020, 2021, 2022]
    populacao_completa = completar_populacao(df_pop, anos)
    assert populacao_completa["populacao"].tolist() == [100, 150, 200]
    assert populacao_completa["ano"].tolist() == [2020, 2021, 2022]
    assert populacao_completa["fonte"].tolist() == [
        "estimativa",
        "interpolado",
        "estimativa",
    ]


def test_completar_populacao_interpolacao_nao_altera_df_pop():
    df_pop = pd.DataFrame(BASE_POP)
    anos = [2021]
    _ = completar_populacao(df_pop, anos)
    pd.testing.assert_frame_equal(df_pop, pd.DataFrame(BASE_POP))
