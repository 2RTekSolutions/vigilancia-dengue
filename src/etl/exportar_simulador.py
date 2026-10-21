"""Exporta os dados do simulador da vigilância para JSON estático.

Uso (na raiz do repositório):
    PYTHONPATH=src uv run python -m etl.exportar_simulador
"""

import json
import math
from datetime import date
from pathlib import Path

import requests

from etl.extrair import extrair
from etl.transformar import transformar, validar

ANO_INICIO = 2018
PASTA_SAIDA = Path("site/dados/simulador")
URL_MALHA = (
    "https://servicodados.ibge.gov.br/api/v3/malhas/municipios/{geocode}"
    "?formato=application/vnd.geo+json&qualidade=minima"
)

# area_urbana = [sul, oeste, norte, leste], onde caem as denúncias simuladas.
MUNICIPIOS = [
    {
        "geocode": 3533908,
        "nome": "Olímpia",
        "uf": "SP",
        "area_urbana": [-20.760, -48.940, -20.715, -48.885],
    },
    {
        "geocode": 3522109,
        "nome": "Itanhaém",
        "uf": "SP",
        "area_urbana": [-24.215, -46.840, -24.160, -46.740],
    },
    {
        "geocode": 3171303,
        "nome": "Viçosa",
        "uf": "MG",
        "area_urbana": [-20.775, -42.900, -20.735, -42.860],
    },
]


def baixar_contorno(geocode: int) -> dict:
    """Baixa o contorno do município (GeoJSON) da API de malhas do IBGE."""
    response = requests.get(URL_MALHA.format(geocode=geocode), timeout=30)
    response.raise_for_status()
    return response.json()


def _numero_ou_none(valor) -> float | None:
    if valor is None or math.isnan(valor):
        return None
    return round(float(valor), 2)


def montar_municipio(config: dict, ano_fim: int, hoje: date) -> dict:
    """Monta o dicionário de um município no formato do simulador."""
    geocode = config["geocode"]
    df = validar(transformar(extrair(geocode, ANO_INICIO, ano_fim), geocode))
    semanas = [
        {
            "data": linha.data_inicio_semana.strftime("%Y-%m-%d"),
            "ano": int(linha.ano),
            "se": int(linha.semana_epidemiologica),
            "casos": int(linha.casos_notificados),
            "temp": _numero_ou_none(linha.temperatura_media),
            "umid": _numero_ou_none(linha.umidade_media),
            "rt": _numero_ou_none(linha.taxa_reproducao_rt),
            "nivel": int(linha.nivel_alerta),
        }
        for linha in df.itertuples()
    ]
    return {
        "geocode": geocode,
        "nome": config["nome"],
        "uf": config["uf"],
        "doenca": "dengue",
        "fonte": "InfoDengue (Fiocruz/FGV)",
        "atualizado_em": hoje.isoformat(),
        "populacao": int(df["populacao"].iloc[-1]),
        "area_urbana": config["area_urbana"],
        "contorno": baixar_contorno(geocode),
        "semanas": semanas,
    }


def exportar(
    pasta: Path = PASTA_SAIDA,
    hoje: date | None = None,
    municipios: list[dict] | None = None,
) -> list[Path]:
    """Grava um JSON por município e a lista municipios.json."""
    hoje = hoje or date.today()
    municipios = municipios or MUNICIPIOS
    pasta.mkdir(parents=True, exist_ok=True)
    caminhos = []
    for config in municipios:
        dados = montar_municipio(config, hoje.year, hoje)
        caminho = pasta / f"{config['geocode']}.json"
        caminho.write_text(
            json.dumps(dados, ensure_ascii=False, allow_nan=False), encoding="utf-8"
        )
        caminhos.append(caminho)
    lista = [
        {"geocode": c["geocode"], "nome": c["nome"], "uf": c["uf"]} for c in municipios
    ]
    (pasta / "municipios.json").write_text(
        json.dumps(lista, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return caminhos


if __name__ == "__main__":
    for caminho in exportar():
        print(caminho)
