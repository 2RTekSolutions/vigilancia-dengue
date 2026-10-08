import io

import pandas as pd
import requests


def extrair(geocode: int, ano_inicio: int, ano_fim: int, doenca: str = "dengue") -> pd.DataFrame:
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
        "ey_end": ano_fim
    }
    base = "https://info.dengue.mat.br/api/alertcity"
  
    response = requests.get(base, params=params, timeout=30) 
    response.raise_for_status()  
    df = pd.read_csv(io.StringIO(response.text))
    if df.empty:
        raise ValueError(f"Nenhum dado encontrado para os parâmetros fornecidos ({geocode} , {ano_inicio}, {ano_fim}).")
    
    return df


if __name__ == "__main__":
    geocode = 3533908  #Olímpia/SP
    ano_inicio = 2020
    ano_fim = 2026
    doenca = "dengue"
    
    df_dengue = extrair(geocode, ano_inicio, ano_fim, doenca)
    print(df_dengue.head())
