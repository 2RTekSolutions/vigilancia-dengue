// Mapa com Leaflet (global L) e tiles do OpenStreetMap.
import { contarAbertasPorSetor } from "./denuncias.js";

const L = globalThis.L;
const COR_SITUACAO = { nova: "#a8212b", agendada: "#2f6db5", vistoriada: "#9ca3af" };

let mapa;
let camadaContorno;
let camadaSetores;
let camadaPontos;
const marcadores = new Map();

export function iniciarMapa(idElemento) {
  mapa = L.map(idElemento, { scrollWheelZoom: false });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);
}

export function mostrarMunicipio(contorno, [sul, oeste, norte, leste]) {
  camadaContorno?.remove();
  camadaContorno = L.geoJSON(contorno, {
    style: { color: "#b20f17", weight: 2, fill: false },
    interactive: false,
  }).addTo(mapa);
  mapa.fitBounds([[sul, oeste], [norte, leste]], { padding: [8, 8] });
}

export function mostrarDenuncias(denuncias, [sul, oeste, norte, leste], aoSelecionar) {
  camadaSetores?.remove();
  camadaPontos?.remove();
  marcadores.clear();

  const carga = contarAbertasPorSetor(denuncias);
  const maximo = Math.max(1, ...Object.values(carga));
  const passoLat = (norte - sul) / 4;
  const passoLon = (leste - oeste) / 4;
  camadaSetores = L.layerGroup().addTo(mapa);
  const setoresComDenuncia = new Set(denuncias.map((d) => d.setor));
  for (let coluna = 0; coluna < 4; coluna++) {
    for (let linha = 0; linha < 4; linha++) {
      const setor = `${"ABCD"[coluna]}${linha + 1}`;
      if (!setoresComDenuncia.has(setor)) continue;
      const abertas = carga[setor] ?? 0;
      const topo = norte - linha * passoLat;
      const esquerda = oeste + coluna * passoLon;
      L.rectangle(
        [[topo - passoLat, esquerda], [topo, esquerda + passoLon]],
        { color: "#a8212b", weight: 1, opacity: 0.35, fillColor: "#a8212b", fillOpacity: 0.06 + 0.34 * (abertas / maximo) },
      )
        .bindTooltip(`Setor ${setor} · ${abertas} denúncia(s) aberta(s)`)
        .addTo(camadaSetores);
    }
  }

  camadaPontos = L.layerGroup().addTo(mapa);
  for (const d of denuncias) {
    const marcador = L.circleMarker([d.lat, d.lon], {
      radius: 6,
      color: "#ffffff",
      weight: 2,
      fillColor: COR_SITUACAO[d.situacao],
      fillOpacity: 1,
    })
      .bindTooltip(`#${d.id} · ${d.tipo} · ${d.situacao}`)
      .on("click", () => aoSelecionar(d.id))
      .addTo(camadaPontos);
    marcadores.set(d.id, marcador);
  }
}

export function destacar(id) {
  for (const [chave, marcador] of marcadores) {
    marcador.setRadius(chave === id ? 10 : 6);
  }
  const marcador = marcadores.get(id);
  if (marcador) {
    marcador.bringToFront();
    marcador.openTooltip();
    mapa.panTo(marcador.getLatLng());
  }
}

export function corDaSituacao(situacao) {
  return COR_SITUACAO[situacao];
}
