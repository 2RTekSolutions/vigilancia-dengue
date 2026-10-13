import io

import pandas as pd
import requests


# Extração InfoDengue
def extrair(
    geocode: int, ano_inicio: int, ano_fim: int, doenca: str = "dengue"
) -> pd.DataFrame:
    """Extrai os dados de dengue do InfoDengue para o município especificado e
    para o intervalo de anos definido.

    Args:
        geocode (int): Código IBGE do município.
        ano_inicio (int): Ano inicial da extração.
        ano_fim (int): Ano final da extração.
        doenca (str, optional): Doença a ser extraída. Padrão é "dengue".

    Returns:
        pd.DataFrame: DataFrame contendo os dados extraídos.
    """

    params = {
        "geocode": geocode,
        "disease": doenca,
        "format": "csv",
        "ew_start": 1,
        "ew_end": 53,
        "ey_start": ano_inicio,
        "ey_end": ano_fim,
    }
    base = "https://info.dengue.mat.br/api/alertcity"

    response = requests.get(base, params=params, timeout=30)
    response.raise_for_status()
    df = pd.read_csv(io.StringIO(response.text))
    if df.empty:
        raise ValueError(
            "Nenhum dado encontrado para os parâmetros fornecidos "
            f"({geocode} , {ano_inicio}, {ano_fim})."
        )

    return df


# Extração IBGE
def extrair_populacao(geocode: int) -> pd.DataFrame:
    """Extrai os dados de população do IBGE para o município especificado.

    Args:
        geocode (int): Código IBGE do município.

    Returns:
        pd.DataFrame: DataFrame contendo os dados extraídos.
    """
    variaveis_url = {
        "estimativa": {"tabela": "6579", "variavel": "9324"},
        "censo": {"tabela": "4709", "variavel": "93"},
    }
    tabela = []
    for fonte, config in variaveis_url.items():
        url = f"https://servicodados.ibge.gov.br/api/v3/agregados/{config['tabela']}/periodos/all/variaveis/{config['variavel']}?localidades=N6[{geocode}]"
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        dados = response.json()
        serie = dados[0]["resultados"][0]["series"][0]["serie"]
        df = pd.DataFrame(
            [
                {
                    "geocode": geocode,
                    "ano": int(ano),
                    "populacao": pd.to_numeric(populacao, errors="coerce"),
                    "fonte": fonte,
                }
                for ano, populacao in serie.items()
            ]
        )
        tabela.append(df)
    resultado = pd.concat(tabela, ignore_index=True)
    if resultado.empty:
        raise ValueError(
            f"Nenhum dado de população encontrado para o geocode {geocode}."
        )
    resultado = resultado.sort_values(by="ano").reset_index(drop=True)

    return resultado


if __name__ == "__main__":
    geocode = 3533908  # Olímpia/SP
    ano_inicio = 2020
    ano_fim = 2026
    doenca = "dengue"

    populacao = extrair_populacao(geocode)
    print(populacao.tail())

    df_dengue = extrair(geocode, ano_inicio, ano_fim, doenca)
    print(df_dengue.head())
