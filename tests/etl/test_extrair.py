import pandas as pd
import pytest
import requests

from etl import extrair


class RespostaFalsa:
    def __init__(self, text, erro_http=False):
        self.text = text
        self.erro_http = erro_http

    def raise_for_status(self):
        if self.erro_http:
            raise requests.exceptions.HTTPError("500 Internal Server Error")


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
