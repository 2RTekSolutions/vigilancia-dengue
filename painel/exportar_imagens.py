"""Gera as imagens estáticas dos gráficos para a página "Os números" do site.

Rodar (na raiz do repositório):  uv run --group painel python painel/exportar_imagens.py
Precisa de um Chrome/Chromium instalado (o kaleido usa ele para desenhar).
"""

import graficos as g

DESTINO = g.RAIZ / "site" / "img" / "painel"
LARGURA = 1000

FIGURAS = {
    "visual-1-casos-temperatura.png": (g.casos_temperatura, 420),
    "visual-2-temperatura-umidade.png": (g.clima_semana_do_ano, 420),
    "visual-3-niveis-alerta.png": (g.niveis_alerta, 360),
    "visual-4-rt-ano-semana.png": (g.rt_ano_semana, 520),
    "visual-5-cartoes.png": (g.cartoes, 170),
}


def main():
    DESTINO.mkdir(parents=True, exist_ok=True)
    df = g.carregar()
    for nome, (funcao, altura) in FIGURAS.items():
        fig = funcao(df, altura=altura)
        fig.write_image(DESTINO / nome, width=LARGURA, height=altura, scale=2)
        print("gerada", nome)


if __name__ == "__main__":
    main()
