import pandas as pd
import pytest
import requests

from etl import extrair


class RespostaFalsa:
    def __init__(self, text="", json=None, erro_http=False):
        self.text = text
        self.erro_http = erro_http
        self.dados_json = json

    def raise_for_status(self):
        if self.erro_http:
            raise requests.exceptions.HTTPError("500 Internal Server Error")

    def json(self):
        return self.dados_json


def test_devolve_dataframe(monkeypatch: pytest.MonkeyPatch):
    csv_falso = "data_iniSE,casos\n2020-01-01,10\n2020-01-02,20"
    monkeypatch.setattr(
        extrair.requests, "get", lambda *args, **kwargs: RespostaFalsa(csv_falso)
    )
    df = extrair.extrair(1234567, 2020, 2020)
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 2
    assert list(df.columns) == ["data_iniSE", "casos"]


def test_levanta_erro_http(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        extrair.requests,
        "get",
        lambda *args, **kwargs: RespostaFalsa("", erro_http=True),
    )
    with pytest.raises(
        requests.exceptions.HTTPError, match="500 Internal Server Error"
    ):
        extrair.extrair(1234567, 2020, 2020)


def test_levanta_erro_valor(monkeypatch: pytest.MonkeyPatch):
    csv_vazio = "data_iniSE,casos\n"
    monkeypatch.setattr(
        extrair.requests, "get", lambda *args, **kwargs: RespostaFalsa(csv_vazio)
    )
    with pytest.raises(ValueError, match="Nenhum dado encontrado"):
        extrair.extrair(1234567, 2020, 2020)


def test_extrair_populacao_devolve_dataframe(monkeypatch: pytest.MonkeyPatch):
    dados_falsos_censo = [
        {
            "resultados": [
                {
                    "series": [
                        {
                            "serie": {
                                "2022": "55000",
                            }
                        }
                    ]
                }
            ]
        }
    ]
    dados_falsos_estimativas = [
        {
            "resultados": [
                {
                    "series": [
                        {
                            "serie": {
                                "2024": "57000",
                                "2023": "55000",
                            }
                        }
                    ]
                }
            ]
        }
    ]

    def get_falso(url, timeout):
        if "4709" in url:
            return RespostaFalsa(json=dados_falsos_censo)
        elif "6579" in url:
            return RespostaFalsa(json=dados_falsos_estimativas)
        else:
            raise AssertionError("URL inesperada")

    monkeypatch.setattr(extrair.requests, "get", get_falso)
    df = extrair.extrair_populacao(1234567)
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 3
    assert list(df.columns) == ["geocode", "ano", "populacao", "fonte"]
    assert df["ano"].tolist() == [2022, 2023, 2024]
    assert df["populacao"].tolist() == [55000, 55000, 57000]
    assert df["fonte"].tolist() == ["censo", "estimativa", "estimativa"]
    assert df["geocode"].tolist() == [1234567, 1234567, 1234567]


def test_extrair_populacao_levanta_erro_http(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        extrair.requests,
        "get",
        lambda *args, **kwargs: RespostaFalsa("", erro_http=True),
    )
    with pytest.raises(
        requests.exceptions.HTTPError, match="500 Internal Server Error"
    ):
        extrair.extrair_populacao(1234567)


def test_extrair_populacao_levanta_erro_valor(monkeypatch: pytest.MonkeyPatch):
    dados_falsos_vazio = [{"resultados": [{"series": [{"serie": {}}]}]}]

    def get_falso(url, timeout):
        return RespostaFalsa(json=dados_falsos_vazio)

    monkeypatch.setattr(extrair.requests, "get", get_falso)
    with pytest.raises(ValueError, match="Nenhum dado de população encontrado"):
        extrair.extrair_populacao(1234567)
