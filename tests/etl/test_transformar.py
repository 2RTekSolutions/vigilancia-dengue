import pandas as pd
import pytest

from etl.transformar import transformar


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
