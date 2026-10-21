import graficos as g
import pandas as pd
import pytest


def test_numeros_dos_cartoes():
    df = pd.DataFrame(
        {
            "casos_notificados": [10, 5, 0],
            "taxa_reproducao_rt": [1.5, 1.0, 0.8],
            "nivel_alerta": [4, 2, 1],
        }
    )
    assert g.numeros(df) == {
        "casos": 15,
        "semanas_rt_acima_1": 1,
        "semanas_vermelho": 1,
    }


@pytest.mark.parametrize(
    ("rt", "faixa"), [(0.0, 0), (1.0, 0), (1.01, 1), (1.2, 1), (1.21, 2)]
)
def test_faixa_rt_nos_limites(rt, faixa):
    assert g.faixa_rt(rt) == faixa


def test_faixa_rt_vazio_continua_vazio():
    assert g.faixa_rt(float("nan")) is None


def test_todas_as_figuras_montam_com_o_csv_real():
    df = g.carregar()
    for funcao in (
        g.casos_temperatura,
        g.niveis_alerta,
        g.clima_semana_do_ano,
        g.rt_ano_semana,
        g.cartoes,
    ):
        assert funcao(df).data, funcao.__name__
