"""Painel do FAROL em Streamlit.

Rodar (na raiz do repositório):  uv run --group painel streamlit run painel/app.py
"""

import base64
from pathlib import Path

import graficos as g
import streamlit as st

PASTA = Path(__file__).resolve().parent
CONFIG = {"displayModeBar": False, "locale": "pt-BR"}

st.set_page_config(page_title="FAROL · Painel da dengue", page_icon="🔦", layout="wide")


def imagem_base64(nome):
    return base64.b64encode((PASTA / "img" / nome).read_bytes()).decode()


LOGO = imagem_base64("farol-cabecalho.jpg")
LOGO_2R = imagem_base64("2rtek-nome.png")
SUBTITULO = (
    "Ferramenta de Antecipação de Risco e Orientação Local"
    " · dados semanais do InfoDengue"
)

st.markdown(
    f"<style>{(PASTA / 'estilo.css').read_text()}</style>", unsafe_allow_html=True
)
st.markdown(
    f"""
    <div class="barra">
        <img class="logo" src="data:image/jpeg;base64,{LOGO}" alt="FAROL">
        <div class="titulo">
            <h1>Vigilância da dengue em Olímpia/SP</h1>
            <p>{SUBTITULO}</p>
        </div>
        <div class="direita">
            <div><b>Projeto de extensão</b><br>DSM · Fatec Olímpia</div>
            <img class="empresa" src="data:image/png;base64,{LOGO_2R}" alt="2RTek">
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)


@st.cache_data
def dados():
    return g.carregar()


df_todo = dados()
anos = sorted(df_todo["ano"].unique())
inicio, fim = st.select_slider("Período", options=anos, value=(anos[0], anos[-1]))
df = df_todo[df_todo["ano"].between(inicio, fim)]


def cartao(coluna, rotulo, valor):
    coluna.markdown(
        f'<div class="cartao"><div class="rotulo">{rotulo}</div>'
        f'<div class="valor">{valor:,}</div></div>'.replace(",", "."),
        unsafe_allow_html=True,
    )


esquerda, direita = st.columns([2, 1], gap="medium")
with esquerda:
    n = g.numeros(df)
    c1, c2, c3 = st.columns(3)
    cartao(c1, "Casos notificados", n["casos"])
    cartao(c2, "Semanas com Rt acima de 1", n["semanas_rt_acima_1"])
    cartao(c3, "Semanas em alerta vermelho", n["semanas_vermelho"])
    st.plotly_chart(g.casos_temperatura(df, altura=440), config=CONFIG)
with direita:
    st.plotly_chart(g.niveis_alerta(df, altura=280), config=CONFIG)
    st.plotly_chart(g.clima_semana_do_ano(df, altura=290), config=CONFIG)

st.plotly_chart(
    g.rt_ano_semana(df, altura=38 * df["ano"].nunique() + 190), config=CONFIG
)

st.markdown(
    '<p class="rodape">Fonte: InfoDengue (Fiocruz/FGV). Dados públicos e agregados por '
    "semana, sem dado de paciente. Apoio à vigilância, não substitui o boletim "
    "oficial. Passe o mouse nos gráficos para ver os valores.</p>",
    unsafe_allow_html=True,
)
