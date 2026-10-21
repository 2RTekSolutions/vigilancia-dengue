import json
from datetime import date

import numpy as np
import pandas as pd
import pytest

from etl import exportar_simulador

CONFIG = {
    "geocode": 3533908,
    "nome": "Olímpia",
    "uf": "SP",
    "area_urbana": [-20.76, -48.94, -20.715, -48.885],
}

CONTORNO = {"type": "FeatureCollection", "features": []}


def bruto_falso(*args, **kwargs):
    return pd.DataFrame(
        {
            "SE": [202403, 202402],
            "data_iniSE": ["2024-01-14", "2024-01-07"],
            "casos": [12, 10],
            "nivel": [2, 1],
            "tempmed": [26.123, np.nan],
            "umidmed": [70.0, 71.5],
            "Rt": [1.234, 0.9],
            "pop": [56037, 56037],
        }
    )


@pytest.fixture
def sem_rede(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(exportar_simulador, "extrair", bruto_falso)
    monkeypatch.setattr(
        exportar_simulador, "baixar_contorno", lambda geocode: CONTORNO
    )


def test_montar_municipio_ordena_e_troca_nan_por_none(sem_rede):
    dados = exportar_simulador.montar_municipio(CONFIG, 2024, date(2026, 10, 21))

    assert dados["geocode"] == 3533908
    assert dados["doenca"] == "dengue"
    assert dados["atualizado_em"] == "2026-10-21"
    assert dados["populacao"] == 56037
    assert dados["contorno"] == CONTORNO
    assert [s["se"] for s in dados["semanas"]] == [2, 3]
    primeira = dados["semanas"][0]
    assert primeira == {
        "data": "2024-01-07",
        "ano": 2024,
        "se": 2,
        "casos": 10,
        "temp": None,
        "umid": 71.5,
        "rt": 0.9,
        "nivel": 1,
    }
    assert dados["semanas"][1]["temp"] == 26.12


def test_exportar_grava_um_json_por_municipio_e_a_lista(sem_rede, tmp_path):
    caminhos = exportar_simulador.exportar(
        pasta=tmp_path, hoje=date(2026, 10, 21), municipios=[CONFIG]
    )

    assert caminhos == [tmp_path / "3533908.json"]
    lista = json.loads((tmp_path / "municipios.json").read_text(encoding="utf-8"))
    assert lista == [{"geocode": 3533908, "nome": "Olímpia", "uf": "SP"}]
    dados = json.loads(caminhos[0].read_text(encoding="utf-8"))
    assert dados["nome"] == "Olímpia"
    assert "NaN" not in caminhos[0].read_text(encoding="utf-8")
