import { useEffect, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { topojson } from 'chartjs-chart-geo'
import { blocColors, countryToBloc, apecMembers, blocLabels } from '../util/blocColors'
import { countryNamesPt } from '../util/countryNames'
import { estados } from '../util/brazilStates'
import { normKey } from '../util/aggregations'
import {
    RENDERIZADOR_SVG,
    FecharTooltipsAoMover,
    ZoomPorPinca,
    ControleDeEscala,
    RosaDosVentos,
    RastreadorDeCursor,
    converterParaUTM,
} from './PiauiMapOSM'
import Carregando from './Carregando'

const COR_PIAUI = '#0e50a6'
const COR_NEUTRA = '#d1d5db'
const COR_DIVISA = '#ffffff'
const ESCALA_AZUIS = ['#e3e8fe', '#b3c6f0', '#7fa3de', '#4a7cc7', '#1661c3', '#0e50a6']

const VISOES = {
    pais: { centro: [15, 0], zoom: 2, zoomMinimo: 2, zoomMaximo: 8, limites: [[-65, -185], [85, 200]] },
    estado: { centro: [-14.5, -52], zoom: 4, zoomMinimo: 3, zoomMaximo: 9, limites: [[-36, -78], [8, -30]] },
    municipios: { centro: [-7.4, -42.8], zoom: 6, zoomMinimo: 5, zoomMaximo: 12, limites: [[-12.5, -48.5], [-1.5, -37.5]] },
}

function corrigirAntimeridiano(colecao) {
    for (const feature of colecao.features) {
        if (feature.properties?.name === 'Antarctica') continue
        const geometria = feature.geometry
        if (!geometria) continue
        const poligonos = geometria.type === 'Polygon' ? [geometria.coordinates]
            : geometria.type === 'MultiPolygon' ? geometria.coordinates
            : []
        for (const poligono of poligonos) {
            for (const anel of poligono) {
                let minimo = Infinity
                let maximo = -Infinity
                for (const [longitude] of anel) {
                    if (longitude < minimo) minimo = longitude
                    if (longitude > maximo) maximo = longitude
                }
                if (maximo - minimo > 180) {
                    for (const par of anel) if (par[0] < 0) par[0] += 360
                }
            }
        }
    }
    return colecao
}

const formatadorDolar = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const formatarValor = (valor) => (valor == null ? '—' : formatadorDolar.format(valor))

const cacheGeometrias = {}

async function carregarGeometrias(nivel) {
    if (cacheGeometrias[nivel]) return cacheGeometrias[nivel]
    let resultado
    if (nivel === 'pais') {
        const atlas = await fetch('https://unpkg.com/world-atlas/countries-50m.json').then((resposta) => resposta.json())
        resultado = { geojson: corrigirAntimeridiano(topojson.feature(atlas, atlas.objects.countries)), nomesPorCodigo: null }
    } else if (nivel === 'estado') {
        const malha = await fetch('https://servicodados.ibge.gov.br/api/v2/malhas/BR?resolucao=2&formato=application/vnd.geo+json')
            .then((resposta) => resposta.json())
        resultado = { geojson: malha, nomesPorCodigo: null }
    } else {
        const [malha, municipios] = await Promise.all([
            fetch('https://servicodados.ibge.gov.br/api/v3/malhas/estados/22?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio')
                .then((resposta) => resposta.json()),
            fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/22/municipios')
                .then((resposta) => resposta.json()),
        ])
        const nomesPorCodigo = Object.fromEntries(municipios.map((municipio) => [String(municipio.id), municipio.nome]))
        resultado = { geojson: malha, nomesPorCodigo }
    }
    cacheGeometrias[nivel] = resultado
    return resultado
}

const linhaHtml = (linhas) =>
    `<div style="font-size:12px;line-height:1.5">${linhas.filter(Boolean).join('<br/>')}</div>`

export default function MapaOSMV1({ nivel = 'pais', data }) {
    const [geometrias, setGeometrias] = useState(null)
    const [erroCarregamento, setErroCarregamento] = useState(null)
    const [posicaoCursor, setPosicaoCursor] = useState(null)
    const referenciaMapa = useRef(null)
    const visao = VISOES[nivel] ?? VISOES.pais

    useEffect(() => {
        let montado = true
        setGeometrias(null)
        setErroCarregamento(null)
        carregarGeometrias(nivel)
            .then((resultado) => { if (montado) setGeometrias(resultado) })
            .catch((erro) => { if (montado) setErroCarregamento(erro.message) })
        return () => { montado = false }
    }, [nivel])

    const nomeDaFeature = (feature) => {
        if (nivel === 'pais') return countryNamesPt[feature.properties.name] ?? feature.properties.name
        if (nivel === 'estado') {
            return estados.find((estado) => String(estado.id) === feature.properties.codarea)?.nome ?? feature.properties.codarea
        }
        return geometrias?.nomesPorCodigo?.[feature.properties.codarea] ?? feature.properties.codarea
    }

    const maximoMunicipio = nivel === 'municipios' && data?.byMunicipio
        ? Math.max(...Object.values(data.byMunicipio).map((registro) => (registro.exportado ?? 0) + (registro.importado ?? 0)), 0)
        : 0

    const corDaFeature = (feature) => {
        if (nivel === 'pais') {
            const nomeIngles = feature.properties.name
            const bloco = countryToBloc[nomeIngles] ?? (apecMembers.has(nomeIngles) ? 'APEC' : 'default')
            return blocColors[bloco] ?? blocColors.default
        }
        if (nivel === 'estado') {
            return feature.properties.codarea === '22' ? COR_PIAUI : COR_NEUTRA
        }
        const registro = data?.byMunicipio?.[normKey(nomeDaFeature(feature))]
        const total = (registro?.exportado ?? 0) + (registro?.importado ?? 0)
        if (!total || !maximoMunicipio) return ESCALA_AZUIS[0]
        const posicao = Math.min(Math.floor((total / maximoMunicipio) * ESCALA_AZUIS.length), ESCALA_AZUIS.length - 1)
        return ESCALA_AZUIS[posicao]
    }

    const tooltipDaFeature = (feature) => {
        const nome = nomeDaFeature(feature)
        if (nivel === 'pais') {
            const nomeIngles = feature.properties.name
            const bloco = countryToBloc[nomeIngles] ?? (apecMembers.has(nomeIngles) ? 'APEC' : null)
            const registro = data?.byCountry?.[normKey(nome)]
            return linhaHtml([
                `<strong>${nome}</strong>`,
                bloco ? (blocLabels[bloco] ?? bloco) : 'Sem bloco econômico',
                bloco !== 'APEC' && apecMembers.has(nomeIngles) ? 'Também membro da APEC' : null,
                registro?.nota,
                registro ? `Exportado: ${formatarValor(registro.exportado)}` : null,
                registro ? `Importado: ${formatarValor(registro.importado)}` : null,
            ])
        }
        if (nivel === 'estado') {
            const registro = feature.properties.codarea === '22' ? data?.byState?.[normKey('Piauí')] : null
            return linhaHtml([
                `<strong>${nome}</strong>`,
                registro ? `Exportado: ${formatarValor(registro.exportado)}` : 'Sem dados',
                registro ? `Importado: ${formatarValor(registro.importado)}` : null,
            ])
        }
        const registro = data?.byMunicipio?.[normKey(nome)]
        return linhaHtml([
            `<strong>${nome}</strong>`,
            `Exportado: ${formatarValor(registro?.exportado ?? 0)}`,
            `Importado: ${formatarValor(registro?.importado ?? 0)}`,
        ])
    }

    const estiloDaFeature = (feature) => ({
        fillColor: corDaFeature(feature),
        fillOpacity: 0.8,
        color: COR_DIVISA,
        weight: 1,
    })

    const configurarFeature = (feature, camada) => {
        camada.bindTooltip(tooltipDaFeature(feature), { sticky: true })
        camada.on({
            mouseover: (evento) => evento.target.setStyle({ weight: 2, color: COR_PIAUI }),
            mouseout: (evento) => {
                evento.target.setStyle(estiloDaFeature(feature))
                evento.target.closeTooltip()
            },
        })
    }

    if (erroCarregamento) {
        return (
            <div className="flex h-[480px] w-full items-center justify-center rounded-lg bg-secondary-100 text-[13px] text-danger">
                Falha ao carregar o mapa: {erroCarregamento}
            </div>
        )
    }

    const coordenadasUTM = posicaoCursor ? converterParaUTM(posicaoCursor.lat, posicaoCursor.lng) : null

    return (
        <div className="flex w-full flex-col gap-3">
            <div className="relative h-[500px] w-full">
                {!geometrias && <Carregando altura="h-full" mensagem="Carregando mapa…" />}
                {geometrias && (
                    <MapContainer
                        key={nivel}
                        center={visao.centro}
                        zoom={visao.zoom}
                        minZoom={visao.zoomMinimo}
                        maxZoom={visao.zoomMaximo}
                        maxBounds={visao.limites ?? undefined}
                        maxBoundsViscosity={visao.limites ? 1.0 : undefined}
                        zoomSnap={0.5}
                        scrollWheelZoom
                        touchZoom
                        renderer={RENDERIZADOR_SVG}
                        ref={referenciaMapa}
                        className="z-0 h-full w-full rounded-lg"
                    >
                        <FecharTooltipsAoMover />
                        <RastreadorDeCursor aoMoverCursor={setPosicaoCursor} />
                        <ControleDeEscala />
                        <ZoomPorPinca />
                        <TileLayer
                            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            className="tiles-fundo-neutro"
                        />
                        <GeoJSON
                            key={`${nivel}|${data ? 'com-dados' : 'sem-dados'}`}
                            data={geometrias.geojson}
                            style={estiloDaFeature}
                            onEachFeature={configurarFeature}
                        />
                    </MapContainer>
                )}

                {geometrias && (
                    <>
                        <button
                            type="button"
                            title="Recentralizar"
                            aria-label="Recentralizar"
                            onClick={() => referenciaMapa.current?.setView(visao.centro, visao.zoom)}
                            className="absolute bottom-8 right-3 z-[1000] flex h-9 w-9 items-center justify-center rounded-md border border-[#d9d9d9] bg-white text-[#232323] shadow-md transition-colors hover:bg-secondary-100"
                        >
                            <LocateFixed size={18} />
                        </button>

                        {posicaoCursor && (
                            <div className="pointer-events-none absolute left-3 top-20 z-[1000] rounded-md border border-[#d9d9d9] bg-white/95 px-3 py-2 text-[12px] leading-relaxed text-[#232323] shadow-md">
                                Lat: {posicaoCursor.lat.toFixed(5)}, Lon: {posicaoCursor.lng.toFixed(5)}<br />
                                E: {coordenadasUTM.este.toFixed(2)}, N: {coordenadasUTM.norte.toFixed(2)}<br />
                                Fuso: {coordenadasUTM.fuso}
                            </div>
                        )}

                        <div className="pointer-events-none absolute bottom-12 left-3 z-[1000]">
                            <RosaDosVentos />
                        </div>
                    </>
                )}
            </div>

            {nivel === 'pais' && (
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {Object.entries(blocColors)
                        .filter(([bloco]) => bloco !== 'default')
                        .map(([bloco, cor]) => (
                            <span key={bloco} className="flex items-center gap-1.5 text-[12px] text-grey-500">
                                <span className="h-3 w-3 rounded-sm border border-[#cbcbcb]" style={{ backgroundColor: cor }} />
                                {blocLabels[bloco] ?? bloco}
                            </span>
                        ))}
                </div>
            )}
            {nivel === 'estado' && (
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    <span className="flex items-center gap-1.5 text-[12px] text-grey-500">
                        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COR_PIAUI }} /> Piauí
                    </span>
                    <span className="flex items-center gap-1.5 text-[12px] text-grey-500">
                        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COR_NEUTRA }} /> Demais estados (sem dados)
                    </span>
                </div>
            )}
            {nivel === 'municipios' && (
                <div className="flex items-center gap-2 text-[12px] text-grey-500">
                    Menor movimento
                    <span className="flex overflow-hidden rounded-sm">
                        {ESCALA_AZUIS.map((cor) => (
                            <span key={cor} className="h-3 w-6" style={{ backgroundColor: cor }} />
                        ))}
                    </span>
                    Maior movimento
                </div>
            )}
        </div>
    )
}
