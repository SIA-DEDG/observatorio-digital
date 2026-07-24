import { useEffect, useMemo, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import L from 'leaflet'
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { CORES_TERRITORIO, TERRITORIOS, territorioDoMunicipio } from '../util/territoriosPI'
import { normKey } from '../util/aggregations'

export const RENDERIZADOR_SVG = L.svg({ padding: 1 })

const URL_MALHA_MUNICIPIOS_PI =
    'https://servicodados.ibge.gov.br/api/v3/malhas/estados/22?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio'
const URL_CONTORNO_ESTADO_PI =
    'https://servicodados.ibge.gov.br/api/v3/malhas/estados/22?formato=application/vnd.geo+json&qualidade=intermediaria'
const URL_NOMES_MUNICIPIOS_PI = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados/22/municipios'

const CENTRO_PIAUI = [-7.4, -42.8]
const ZOOM_INICIAL = 6
const ZOOM_MINIMO = 6
const ZOOM_MAXIMO = 12
const LIMITES_NAVEGACAO = [
    [-12.5, -48.5],
    [-1.5, -37.5], 
]

const COR_SEM_TERRITORIO = '#d1d5db'
const COR_CONTORNO_ESTADO = '#6b7280'
const COR_DIVISA_MUNICIPIOS = '#ffffff'
const COR_DESTAQUE_HOVER = '#0e50a6'

function escurecerCor(corHex, fator = 0.55) {
    const canais = corHex.replace('#', '').match(/.{2}/g)
    return `#${canais.map((canal) => Math.round(parseInt(canal, 16) * fator).toString(16).padStart(2, '0')).join('')}`
}

const formatadorDolar = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const formatarValor = (valor) => (valor == null ? '—' : formatadorDolar.format(valor))

export function converterParaUTM(latitude, longitude) {
    const fuso = Math.floor((longitude + 180) / 6) + 1
    const raioEquatorial = 6378137
    const achatamento = 1 / 298.257223563
    const fatorEscala = 0.9996
    const excentricidade2 = achatamento * (2 - achatamento)
    const excentricidadeLinha2 = excentricidade2 / (1 - excentricidade2)
    const paraRadianos = Math.PI / 180
    const latitudeRad = latitude * paraRadianos
    const longitudeRad = longitude * paraRadianos
    const meridianoCentralRad = ((fuso - 1) * 6 - 180 + 3) * paraRadianos
    const seno = Math.sin(latitudeRad)
    const cosseno = Math.cos(latitudeRad)
    const raioVertical = raioEquatorial / Math.sqrt(1 - excentricidade2 * seno * seno)
    const tangente2 = Math.tan(latitudeRad) ** 2
    const curvatura = excentricidadeLinha2 * cosseno * cosseno
    const deltaLongitude = cosseno * (longitudeRad - meridianoCentralRad)
    const e2 = excentricidade2
    const arcoMeridiano = raioEquatorial * (
        (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256) * latitudeRad
        - ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * latitudeRad)
        + ((15 * e2 * e2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * latitudeRad)
        - ((35 * e2 ** 3) / 3072) * Math.sin(6 * latitudeRad)
    )
    const este = fatorEscala * raioVertical * (
        deltaLongitude
        + ((1 - tangente2 + curvatura) * deltaLongitude ** 3) / 6
        + ((5 - 18 * tangente2 + tangente2 * tangente2 + 72 * curvatura - 58 * excentricidadeLinha2) * deltaLongitude ** 5) / 120
    ) + 500000
    let norte = fatorEscala * (
        arcoMeridiano + raioVertical * Math.tan(latitudeRad) * (
            (deltaLongitude * deltaLongitude) / 2
            + ((5 - tangente2 + 9 * curvatura + 4 * curvatura * curvatura) * deltaLongitude ** 4) / 24
            + ((61 - 58 * tangente2 + tangente2 * tangente2 + 600 * curvatura - 330 * excentricidadeLinha2) * deltaLongitude ** 6) / 720
        )
    )
    if (latitude < 0) norte += 10000000
    return { fuso, este, norte }
}

export function FecharTooltipsAoMover() {
    const desativarInteratividade = (mapa) => {
        mapa.eachLayer((camada) => {
            camada.closeTooltip?.()
            if (camada._path) camada._path.style.pointerEvents = 'none'
        })
    }
    const reativarInteratividade = (mapa) => {
        mapa.eachLayer((camada) => {
            if (camada._path) camada._path.style.pointerEvents = ''
        })
    }
    useMapEvents({
        movestart: (evento) => desativarInteratividade(evento.target),
        zoomstart: (evento) => desativarInteratividade(evento.target),
        moveend: (evento) => reativarInteratividade(evento.target),
        zoomend: (evento) => reativarInteratividade(evento.target),
    })
    return null
}

export function ZoomPorPinca() {
    const mapa = useMap()
    useEffect(() => {
        const containerDoMapa = mapa.getContainer()
        let deltaAcumulado = 0
        const tratarRolagem = (evento) => {
            if (!evento.ctrlKey) return
            evento.preventDefault()
            evento.stopPropagation()
            deltaAcumulado += -evento.deltaY
            if (Math.abs(deltaAcumulado) < 15) return
            const passoDeZoom = deltaAcumulado > 0 ? 0.5 : -0.5
            deltaAcumulado = 0
            const areaDoMapa = containerDoMapa.getBoundingClientRect()
            const pontoDoCursor = L.point(evento.clientX - areaDoMapa.left, evento.clientY - areaDoMapa.top)
            mapa.setZoomAround(pontoDoCursor, mapa.getZoom() + passoDeZoom)
        }
        containerDoMapa.addEventListener('wheel', tratarRolagem, { passive: false })
        return () => containerDoMapa.removeEventListener('wheel', tratarRolagem)
    }, [mapa])
    return null
}

export function ControleDeEscala() {
    const mapa = useMap()
    useEffect(() => {
        const controleDeEscala = L.control.scale({ position: 'bottomleft', imperial: true })
        controleDeEscala.addTo(mapa)
        return () => controleDeEscala.remove()
    }, [mapa])
    return null
}

export function RosaDosVentos() {
    return (
        <svg width="38" height="48" viewBox="0 0 24 30" aria-label="Norte">
            <text x="12" y="8" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#232323">N</text>
            <path d="M12 10 L7 27 L12 23 Z" fill="#232323" stroke="#232323" strokeWidth="0.75" strokeLinejoin="round" />
            <path d="M12 10 L17 27 L12 23 Z" fill="#ffffff" stroke="#232323" strokeWidth="0.75" strokeLinejoin="round" />
        </svg>
    )
}

export function RastreadorDeCursor({ aoMoverCursor }) {
    useMapEvents({
        mousemove: (evento) => aoMoverCursor(evento.latlng),
        mouseout: () => aoMoverCursor(null),
    })
    return null
}

const MAXIMO_MUNICIPIOS = 5
const MAXIMO_TERRITORIOS = 5

export default function PiauiMapOSM({
    data,
    territorios = [],
    onTerritoriosChange,
    municipios = [],
    onMunicipiosChange,
}) {
    const [malhaMunicipios, setMalhaMunicipios] = useState(null)
    const [contornoEstado, setContornoEstado] = useState(null)
    const [nomePorCodigo, setNomePorCodigo] = useState({})
    const [erroCarregamento, setErroCarregamento] = useState(null)
    const [posicaoCursor, setPosicaoCursor] = useState(null)
    const referenciaMapa = useRef(null)

    const municipiosSelecionados = useMemo(() => new Set(municipios.map(normKey)), [municipios])
    const territoriosSelecionados = useMemo(() => new Set(territorios), [territorios])

    useEffect(() => {
        let montado = true
        const lerJson = (resposta) =>
            resposta.ok ? resposta.json() : Promise.reject(new Error(`IBGE ${resposta.status}`))

        fetch(URL_MALHA_MUNICIPIOS_PI).then(lerJson)
            .then((malha) => { if (montado) setMalhaMunicipios(malha) })
            .catch((erro) => { if (montado) setErroCarregamento(erro.message) })

        fetch(URL_CONTORNO_ESTADO_PI).then(lerJson)
            .then((malha) => { if (montado) setContornoEstado(malha) })
            .catch(() => {})

        fetch(URL_NOMES_MUNICIPIOS_PI).then(lerJson)
            .then((municipios) => {
                if (!montado) return
                const nomes = {}
                for (const municipio of municipios) nomes[String(municipio.id)] = municipio.nome
                setNomePorCodigo(nomes)
            })
            .catch((erro) => { if (montado) setErroCarregamento(erro.message) })

        return () => { montado = false }
    }, [])

    const nomeDoMunicipio = (feature) => nomePorCodigo[feature.properties.codarea] ?? null
    const registroDoMunicipio = (nome) => (nome ? data?.[normKey(nome)] : null)

    const limitesPorTerritorio = useMemo(() => {
        if (!malhaMunicipios || Object.keys(nomePorCodigo).length === 0) return {}
        const limites = {}
        for (const feature of malhaMunicipios.features) {
            const nome = nomePorCodigo[feature.properties.codarea]
            const territorio = nome ? territorioDoMunicipio(nome) : null
            if (!territorio) continue
            const limiteDoMunicipio = L.geoJSON(feature).getBounds()
            limites[territorio] = limites[territorio]
                ? limites[territorio].extend(limiteDoMunicipio)
                : limiteDoMunicipio
        }
        return limites
    }, [malhaMunicipios, nomePorCodigo])

    const limitesPorMunicipio = useMemo(() => {
        if (!malhaMunicipios || Object.keys(nomePorCodigo).length === 0) return {}
        const limites = {}
        for (const feature of malhaMunicipios.features) {
            const nome = nomePorCodigo[feature.properties.codarea]
            if (nome) limites[normKey(nome)] = L.geoJSON(feature).getBounds()
        }
        return limites
    }, [malhaMunicipios, nomePorCodigo])

    const totaisPorTerritorio = useMemo(() => {
        const totais = {}
        for (const registro of Object.values(data ?? {})) {
            const territorio = registro.nome ? territorioDoMunicipio(registro.nome) : null
            if (!territorio) continue
            totais[territorio] ??= { exportado: 0, importado: 0 }
            totais[territorio].exportado += registro.exportado ?? 0
            totais[territorio].importado += registro.importado ?? 0
        }
        return totais
    }, [data])

    const alternarTerritorio = (territorio) => {
        const jaSelecionado = territoriosSelecionados.has(territorio)
        if (jaSelecionado) {
            onTerritoriosChange?.(territorios.filter((item) => item !== territorio))
        } else if (territorios.length < MAXIMO_TERRITORIOS) {
            onTerritoriosChange?.([...territorios, territorio])
        }
    }

    const alternarMunicipio = (nome) => {
        const chave = normKey(nome)
        const jaSelecionado = municipiosSelecionados.has(chave)
        if (jaSelecionado) {
            onMunicipiosChange?.(municipios.filter((municipio) => normKey(municipio) !== chave))
        } else if (municipios.length < MAXIMO_MUNICIPIOS) {
            onMunicipiosChange?.([...municipios, nome])
        }
    }

    useEffect(() => {
        const mapa = referenciaMapa.current
        if (!mapa) return
        const unir = (listaDeLimites) => {
            let uniao = null
            for (const limite of listaDeLimites) {
                if (!limite) continue
                uniao = uniao ? uniao.extend(limite) : L.latLngBounds(limite.getSouthWest(), limite.getNorthEast())
            }
            return uniao
        }
        if (municipios.length > 0) {
            const limites = unir(municipios.map((municipio) => limitesPorMunicipio[normKey(municipio)]))
            if (limites) mapa.fitBounds(limites, { padding: [48, 48] })
        } else if (territorios.length > 0) {
            const limites = unir(territorios.map((territorio) => limitesPorTerritorio[territorio]))
            if (limites) mapa.fitBounds(limites, { padding: [24, 24] })
        } else {
            mapa.setView(CENTRO_PIAUI, ZOOM_INICIAL)
        }
    }, [territorios, municipios, limitesPorTerritorio, limitesPorMunicipio])

    const estiloDoMunicipio = (feature) => {
        const nome = nomeDoMunicipio(feature)
        const territorio = nome ? territorioDoMunicipio(nome) : null
        const selecionado = nome ? municipiosSelecionados.has(normKey(nome)) : false
        const dentroDaSelecao = municipios.length > 0
            ? selecionado
            : territorios.length === 0 || territoriosSelecionados.has(territorio)
        const corDoTerritorio = territorio ? CORES_TERRITORIO[territorio] : COR_SEM_TERRITORIO
        return {
            fillColor: selecionado ? escurecerCor(corDoTerritorio) : corDoTerritorio,
            fillOpacity: selecionado ? 0.9 : dentroDaSelecao ? 0.75 : 0.2,
            color: COR_DIVISA_MUNICIPIOS,
            weight: 1,
        }
    }

    const configurarMunicipio = (feature, camada) => {
        const nome = nomeDoMunicipio(feature) ?? `Município ${feature.properties.codarea}`
        const registro = registroDoMunicipio(nome)
        const territorio = territorioDoMunicipio(nome)
        const mostrarMunicipio =
            municipios.length > 0 ||
            territoriosSelecionados.has(territorio)

        let conteudoTooltip
        if (mostrarMunicipio) {
            conteudoTooltip = `<div style="font-size:12px;line-height:1.5">
                <strong>${nome}</strong><br/>
                Território: ${territorio}<br/>
                Exportado: ${formatarValor(registro?.exportado ?? 0)}<br/>
                Importado: ${formatarValor(registro?.importado ?? 0)}
            </div>`
        } else {
            const totais = totaisPorTerritorio[territorio]
            const quantidadeMunicipios = TERRITORIOS[territorio]?.length
            conteudoTooltip = `<div style="font-size:12px;line-height:1.5">
                <strong>${territorio ?? 'Sem território'}</strong><br/>
                ${quantidadeMunicipios ? `${quantidadeMunicipios} municípios<br/>` : ''}
                Exportado: ${formatarValor(totais?.exportado ?? 0)}<br/>
                Importado: ${formatarValor(totais?.importado ?? 0)}<br/>
                <em>Clique para ver os municípios</em>
            </div>`
        }
        camada.bindTooltip(conteudoTooltip, { sticky: true })

        camada.on({
            click: () => {
                if (mostrarMunicipio) {
                    alternarMunicipio(nome)
                } else if (territorio) {
                    alternarTerritorio(territorio)
                }
            },
            mouseover: (evento) => evento.target.setStyle({ weight: 2, color: COR_DESTAQUE_HOVER }),
            mouseout: (evento) => {
                evento.target.setStyle(estiloDoMunicipio(feature))
                evento.target.closeTooltip()
            },
        })
    }

    if (erroCarregamento) {
        return (
            <div className="flex h-[500px] w-full items-center justify-center rounded-lg bg-secondary-100 text-[13px] text-danger">
                Falha ao carregar dados do IBGE: {erroCarregamento}
            </div>
        )
    }

    const coordenadasUTM = posicaoCursor ? converterParaUTM(posicaoCursor.lat, posicaoCursor.lng) : null

    return (
        <div className="flex h-full w-full flex-col gap-3">
            <div className="relative min-h-[400px] w-full flex-1">
                <MapContainer
                    center={CENTRO_PIAUI}
                    zoom={ZOOM_INICIAL}
                    minZoom={ZOOM_MINIMO}
                    maxZoom={ZOOM_MAXIMO}
                    maxBounds={LIMITES_NAVEGACAO}
                    maxBoundsViscosity={1.0}
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
                    {malhaMunicipios && Object.keys(nomePorCodigo).length > 0 && (
                        <GeoJSON
                            key={`${territorios.join(',') || 'estado'}|${municipios.join(',')}`}
                            data={malhaMunicipios}
                            style={estiloDoMunicipio}
                            onEachFeature={configurarMunicipio}
                        />
                    )}
                    {contornoEstado && (
                        <GeoJSON
                            data={contornoEstado}
                            interactive={false}
                            style={{ fill: false, color: COR_CONTORNO_ESTADO, weight: 2 }}
                        />
                    )}
                </MapContainer>

                <button
                    type="button"
                    title="Voltar ao Piauí"
                    aria-label="Voltar ao Piauí"
                    onClick={() => {
                        onMunicipiosChange?.([])
                        onTerritoriosChange?.([])
                        referenciaMapa.current?.setView(CENTRO_PIAUI, ZOOM_INICIAL)
                    }}
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
            </div>

        </div>
    )
}
