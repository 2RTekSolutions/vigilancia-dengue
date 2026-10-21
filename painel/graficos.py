"""Gráficos do painel do FAROL (os mesmos visuais do dashboard do Power BI).

Cada função recebe o DataFrame do CSV dos gráficos e devolve uma figura Plotly.
O app Streamlit (app.py) e o exportador de imagens do site usam as mesmas funções.
"""

from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

RAIZ = Path(__file__).resolve().parents[1]
CSV = RAIZ / "data" / "processed" / "data_dengue_graficos.csv"

# Paleta do FAROL
FUNDO = "#0A2246"
CARTAO = "#102D57"
BORDA = "#1F3B66"
BRANCO = "#FFFFFF"
CINZA = "#B8C7DD"
CIANO = "#38E4AE"
AZUL = "#1D63B8"
DESTAQUE = "#D9ED92"

# Níveis de alerta do InfoDengue: as cores são o nome do nível, então ficam.
NIVEIS = {
    "Verde (Baixo)": "#4CAF50",
    "Amarelo (Atenção)": "#F2D33C",
    "Laranja (Alerta)": "#F28C28",
    "Vermelho (Crítico)": "#E5383B",
}

# Faixas do Rt no mapa de calor: escala de frio para quente, com brilho bem
# diferente entre uma faixa e outra (contraste no fundo azul-marinho).
FAIXAS_RT = [
    ("Rt até 1: estável ou caindo", "#4A90E2"),
    ("Rt de 1 a 1,2: crescendo devagar", "#F4E04D"),
    ("Rt acima de 1,2: crescendo rápido", "#FF7A1A"),
]


def carregar(caminho=CSV):
    """Lê o CSV dos gráficos com a data como datetime."""
    return pd.read_csv(caminho, parse_dates=["data_inicio_semana"])


def numeros(df):
    """Os três números dos cartões."""
    return {
        "casos": int(df["casos_notificados"].sum()),
        "semanas_rt_acima_1": int((df["taxa_reproducao_rt"] > 1).sum()),
        "semanas_vermelho": int((df["nivel_alerta"] == 4).sum()),
    }


def _layout(fig, titulo, altura):
    fig.update_layout(
        title={"text": titulo, "font": {"size": 16, "color": BRANCO}, "x": 0.01},
        height=altura,
        paper_bgcolor=CARTAO,
        plot_bgcolor=CARTAO,
        font={"color": CINZA, "family": "Segoe UI, Roboto, sans-serif"},
        margin={"l": 50, "r": 30, "t": 60, "b": 40},
        legend={
            "orientation": "h",
            "y": 1.08,
            "x": 1,
            "xanchor": "right",
            "font": {"color": BRANCO},
        },
        separators=",.",
    )
    fig.update_xaxes(gridcolor=BORDA, zeroline=False)
    fig.update_yaxes(gridcolor=BORDA, zeroline=False)
    return fig


def casos_temperatura(df, altura=380):
    """Colunas com os casos por semana e linha com a temperatura média."""
    fig = make_subplots(specs=[[{"secondary_y": True}]])
    fig.add_bar(
        x=df["data_inicio_semana"],
        y=df["casos_notificados"],
        name="Casos",
        marker_color=CIANO,
        hovertemplate="Semana de %{x|%d/%m/%Y}<br>%{y} casos<extra></extra>",
    )
    fig.add_scatter(
        x=df["data_inicio_semana"],
        y=df["temperatura_media"],
        name="Temperatura média (°C)",
        mode="lines",
        line={"color": DESTAQUE, "width": 1.5, "shape": "spline"},
        opacity=0.85,
        connectgaps=False,  # semana sem medição fica em branco, sem inventar valor
        hovertemplate="Semana de %{x|%d/%m/%Y}<br>%{y:.1f} °C<extra></extra>",
        secondary_y=True,
    )
    fig.update_yaxes(title_text="Casos", secondary_y=False)
    fig.update_yaxes(
        title_text="Temperatura média (°C)",
        range=[10, 33],
        tick0=10,
        dtick=5,
        showgrid=False,
        secondary_y=True,
    )
    return _layout(fig, "Casos de dengue por semana e temperatura média", altura)


def niveis_alerta(df, altura=300):
    """Rosca com quantas semanas ficaram em cada nível de alerta."""
    contagem = (
        df["nivel_alerta_desc"].value_counts().reindex(NIVEIS.keys(), fill_value=0)
    )
    fig = go.Figure(
        go.Pie(
            labels=contagem.index,
            values=contagem.values,
            hole=0.55,
            sort=False,
            marker={
                "colors": list(NIVEIS.values()),
                "line": {"color": CARTAO, "width": 2},
            },
            textinfo="value",
            textfont={"color": FUNDO, "size": 13},
            hovertemplate="%{label}<br>%{value} semanas (%{percent})<extra></extra>",
        )
    )
    _layout(fig, "Semanas em cada nível de alerta do InfoDengue", altura)
    fig.update_layout(
        legend={"orientation": "v", "y": 0.5, "x": 1.02, "xanchor": "left"},
        margin={"l": 20, "r": 20, "t": 60, "b": 20},
    )
    return fig


def clima_semana_do_ano(df, altura=300):
    """Uma bolha por semana do ano (1 a 53), com a média do clima de todos os anos.

    O tamanho da bolha é o maior número de casos que aquela semana já teve.
    """
    por_semana = (
        df.groupby("semana_epidemiologica")
        .agg(
            umidade=("umidade_media", "mean"),
            temperatura=("temperatura_media", "mean"),
            casos=("casos_notificados", "max"),
        )
        .reset_index()
    )
    fig = go.Figure(
        go.Scatter(
            x=por_semana["umidade"],
            y=por_semana["temperatura"],
            mode="markers",
            customdata=por_semana[["semana_epidemiologica", "casos"]],
            marker={
                "size": por_semana["casos"],
                "sizemode": "area",
                "sizeref": 2 * por_semana["casos"].max() / 45**2,
                "sizemin": 3,
                "color": CIANO,
                "opacity": 0.6,
                "line": {"color": BRANCO, "width": 0.5},
            },
            hovertemplate=(
                "Semana %{customdata[0]}<br>Umidade média %{x:.0f}%<br>"
                "Temperatura média %{y:.1f} °C<br>"
                "Maior nº de casos: %{customdata[1]}<extra></extra>"
            ),
        )
    )
    fig.update_xaxes(title_text="Umidade média (%)")
    fig.update_yaxes(title_text="Temperatura média (°C)")
    _layout(fig, "Clima médio de cada semana do ano", altura)
    fig.update_layout(
        title={
            "subtitle": {
                "text": "Bolha = maior nº de casos que a semana já teve",
                "font": {"color": CINZA, "size": 12},
            }
        },
        margin={"t": 75},
    )
    return fig


def faixa_rt(rt):
    """0, 1 ou 2 conforme a faixa do Rt; vazio continua vazio."""
    if pd.isna(rt):
        return None
    if rt <= 1:
        return 0
    if rt <= 1.2:
        return 1
    return 2


def rt_ano_semana(df, altura=360):
    """Mapa de calor do Rt: uma linha por ano, uma coluna por semana."""
    rt = df.pivot_table(
        index="ano",
        columns="semana_epidemiologica",
        values="taxa_reproducao_rt",
        aggfunc="mean",
    )
    faixas = rt.map(faixa_rt)
    cores = [c for _, c in FAIXAS_RT]
    escala = [
        [0, cores[0]],
        [1 / 3, cores[0]],
        [1 / 3, cores[1]],
        [2 / 3, cores[1]],
        [2 / 3, cores[2]],
        [1, cores[2]],
    ]
    fig = go.Figure(
        go.Heatmap(
            z=faixas.values.astype(float),
            x=rt.columns,
            y=[str(a) for a in rt.index],
            customdata=rt.values,
            zmin=-0.5,
            zmax=2.5,
            colorscale=escala,
            showscale=False,
            xgap=2,
            ygap=2,
            hovertemplate="%{y}, semana %{x}<br>Rt = %{customdata:.2f}<extra></extra>",
        )
    )
    for (
        nome,
        hexa,
    ) in FAIXAS_RT:  # entradas de legenda (o heatmap não tem legenda própria)
        fig.add_scatter(
            x=[None],
            y=[None],
            mode="markers",
            name=nome,
            marker={"symbol": "square", "size": 16, "color": hexa},
        )
    fig.update_xaxes(title_text="Semana epidemiológica", dtick=4, showgrid=False)
    fig.update_yaxes(autorange="reversed", showgrid=False, type="category")
    _layout(fig, "Rt por ano e semana epidemiológica", altura)
    fig.update_layout(
        legend={
            "font": {"size": 15, "color": BRANCO},
            "y": 1.02,
            "yanchor": "bottom",
            "x": 0,
            "xanchor": "left",
            "itemsizing": "constant",
            "bgcolor": FUNDO,
            "bordercolor": BORDA,
            "borderwidth": 1,
        },
        margin={"t": 105},
    )
    return fig


def cartoes(df, altura=170):
    """Os três números como figura (para a imagem estática do site)."""
    n = numeros(df)
    itens = [
        ("Casos notificados", n["casos"]),
        ("Semanas com Rt acima de 1", n["semanas_rt_acima_1"]),
        ("Semanas em alerta vermelho", n["semanas_vermelho"]),
    ]
    fig = go.Figure()
    for i, (rotulo, valor) in enumerate(itens):
        fig.add_trace(
            go.Indicator(
                mode="number",
                value=valor,
                number={"font": {"color": CIANO, "size": 52}, "valueformat": ",d"},
                title={"text": rotulo, "font": {"color": CINZA, "size": 16}},
                domain={"row": 0, "column": i},
            )
        )
    fig.update_layout(
        grid={"rows": 1, "columns": 3},
        height=altura,
        paper_bgcolor=CARTAO,
        separators=",.",
        margin={"l": 10, "r": 10, "t": 40, "b": 10},
    )
    return fig
