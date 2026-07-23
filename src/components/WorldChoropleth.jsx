import { useEffect, useRef } from 'react';
import { Chart, LinearScale, Tooltip } from 'chart.js';
import {
    ChoroplethController,
    ColorScale,
    ProjectionScale,
    GeoFeature,
    topojson,
} from 'chartjs-chart-geo';
import { blocColors, countryToBloc, apecMembers, blocLabels } from '../util/blocColors';
import { countryNamesPt } from '../util/countryNames';
import { estados, regiaoColors, regiaoLabels } from '../util/brazilStates';
import { normKey } from '../util/aggregations';

const usdFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const formatValor = (valor) => (valor == null ? "—" : usdFormatter.format(valor));

function resolveBloc(countryName) {
    if (countryToBloc[countryName]) return countryToBloc[countryName];
    if (apecMembers.has(countryName)) return "APEC";
    return null;
}

function mapDataLines(level, nome, mapData) {
    if (!mapData) return [];
    const dadosDoNivel = level === "world" ? mapData.byCountry
        : level === "brazil-states" ? mapData.byState
        : mapData.byMunicipio;
    const registro = dadosDoNivel?.[normKey(nome)];
    if (registro) return [
        ...(registro.nota ? [registro.nota] : []),
        `Exportado: ${formatValor(registro.exportado)}`,
        `Importado: ${formatValor(registro.importado)}`,
    ];
    if (level === "brazil-municipios") return [
        `Exportado: ${formatValor(0)}`,
        `Importado: ${formatValor(0)}`,
    ];
    return [];
}

function buildBlocTooltipLines(countryName) {
    const bloc = resolveBloc(countryName);
    if (!bloc) return ["Sem bloco econômico"];

    const lines = [blocLabels[bloc] ?? bloc];
    if (bloc !== "APEC" && apecMembers.has(countryName)) lines.push("Também membro da APEC");
    return lines;
}

Chart.register(ChoroplethController, GeoFeature, ColorScale, ProjectionScale, LinearScale, Tooltip);

const hatchPatternCache = {};
function getHatchPattern(baseColor) {
    if (hatchPatternCache[baseColor]) return hatchPatternCache[baseColor];

    const tileSize = 8;
    const tile = document.createElement("canvas");
    tile.width = tile.height = tileSize;
    const tileCtx = tile.getContext("2d");

    tileCtx.fillStyle = baseColor;
    tileCtx.fillRect(0, 0, tileSize, tileSize);

    tileCtx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    tileCtx.lineWidth = 2;
    tileCtx.beginPath();
    tileCtx.moveTo(-2, tileSize - 2);
    tileCtx.lineTo(tileSize - 2, -2);
    tileCtx.moveTo(2, tileSize + 2);
    tileCtx.lineTo(tileSize + 2, 2);
    tileCtx.stroke();

    const pattern = tileCtx.createPattern(tile, "repeat");
    hatchPatternCache[baseColor] = pattern;
    return pattern;
}

async function loadWorld() {
    const data = await fetch("https://unpkg.com/world-atlas/countries-50m.json").then((response) => response.json());
    const countries = topojson.feature(data, data.objects.countries).features;

    return {
        features: countries,
        labels: countries.map((country) => countryNamesPt[country.properties.name] ?? country.properties.name),
        backgroundColor: (feature) => {
            const countryName = feature.properties.name;
            const bloc = countryToBloc[countryName] ?? "default";
            const baseColor = blocColors[bloc] ?? blocColors.default;
            if (apecMembers.has(countryName)) {
                return getHatchPattern(bloc === "default" ? "#bdbdbd" : baseColor);
            }
            return baseColor;
        },
        tooltipTitle: (feature) => countryNamesPt[feature.properties.name] ?? feature.properties.name,
        tooltipLines: (feature) => buildBlocTooltipLines(feature.properties.name),
        outline: { type: "Sphere" },
        oceanColor: "#a8d1ea",
        projection: "equalEarth",
        datasetLabel: "Países",
    };
}

async function loadBrazilStates() {
    const data = await fetch(
        "https://servicodados.ibge.gov.br/api/v2/malhas/BR?resolucao=2&formato=application/vnd.geo+json"
    ).then((response) => response.json());
    const features = data.features;

    return {
        features,
        labels: features.map((feature) => estados.find((estado) => String(estado.id) === feature.properties.codarea)?.nome ?? feature.properties.codarea),
        backgroundColor: (feature) => {
            const estado = estados.find((estado) => String(estado.id) === feature.properties.codarea);
            return regiaoColors[estado?.regiao] ?? "#9e9e9e";
        },
        tooltipTitle: (feature) => estados.find((estado) => String(estado.id) === feature.properties.codarea)?.nome ?? feature.properties.codarea,
        tooltipLines: (feature) => {
            const estado = estados.find((estado) => String(estado.id) === feature.properties.codarea);
            return estado ? [`Região: ${regiaoLabels[estado.regiao] ?? estado.regiao}`] : [];
        },
        outline: { type: "FeatureCollection", features },
        oceanColor: null,
        projection: "mercator",
        datasetLabel: "Estados",
    };
}

async function loadBrazilMunicipios(uf) {
    const [meshData, municipios] = await Promise.all([
        fetch(`https://servicodados.ibge.gov.br/api/v2/malhas/${uf}?resolucao=5&formato=application/vnd.geo+json`).then((response) => response.json()),
        fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`).then((response) => response.json()),
    ]);
    const features = meshData.features;
    const nameById = Object.fromEntries(municipios.map((municipio) => [String(municipio.id), municipio.nome]));
    const selectedEstado = estados.find((estado) => estado.id === Number(uf));

    return {
        features,
        labels: features.map((feature) => nameById[feature.properties.codarea] ?? feature.properties.codarea),
        tooltipTitle: (feature) => nameById[feature.properties.codarea] ?? feature.properties.codarea,
        tooltipLines: () => (selectedEstado ? [selectedEstado.nome] : []),
        outline: { type: "FeatureCollection", features },
        oceanColor: null,
        backgroundColor: () => regiaoColors[selectedEstado?.regiao] ?? "#607d8b",
        projection: "mercator",
        datasetLabel: "Municípios",
    };
}

const UF_FOCO = "22";

function nivelToView(nivel) {
    if (nivel === "estado") return { level: "brazil-states" };
    if (nivel === "municipios") return { level: "brazil-municipios", uf: UF_FOCO };
    return { level: "world" };
}

function cacheKeyFor(view) {
    return view.level === "brazil-municipios" ? `${view.level}:${view.uf}` : view.level;
}

export default function WorldChoropleth({ nivel = "pais", data }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const layerCacheRef = useRef({});
    const dataRef = useRef(data);
    dataRef.current = data;

    useEffect(() => {
        let isMounted = true;
        let rafId = null;
        const view = nivelToView(nivel);

        const loaders = {
            world: () => loadWorld(),
            "brazil-states": () => loadBrazilStates(),
            "brazil-municipios": () => loadBrazilMunicipios(view.uf),
        };

        const cacheKey = cacheKeyFor(view);
        const cached = layerCacheRef.current[cacheKey];
        const layerPromise = cached
            ? Promise.resolve(cached)
            : loaders[view.level]().then((layer) => {
                layerCacheRef.current[cacheKey] = layer;
                return layer;
            });

        const buildChart = (layer) => {
            if (!isMounted || !canvasRef.current) return;

            chartRef.current?.destroy();

            chartRef.current = new Chart(canvasRef.current.getContext("2d"), {
                type: "choropleth",
                data: {
                    labels: layer.labels,
                    datasets: [{
                        label: layer.datasetLabel,
                        outline: layer.outline,
                        outlineBackgroundColor: layer.oceanColor ?? "transparent",
                        outlineBorderColor: layer.oceanColor ? "#5b8db3" : "#bdbdbd",
                        outlineBorderWidth: 1,
                        borderColor: "#ffffff",
                        borderWidth: 1,
                        data: layer.features.map((feature) => ({ feature, value: 0 })),
                        backgroundColor: (ctx) => {
                            const item = ctx.dataset?.data?.[ctx.dataIndex];
                            return item ? layer.backgroundColor(item.feature) : "#9e9e9e";
                        },
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    showOutline: true,
                    showGraticule: view.level === "world",
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            displayColors: false,
                            padding: 10,
                            titleFont: { size: 13 },
                            bodyFont: { size: 11 },
                            callbacks: {
                                title: (items) => {
                                    const feature = items[0]?.raw?.feature;
                                    return feature ? layer.tooltipTitle(feature) : "";
                                },
                                label: (item) => {
                                    const feature = item.raw.feature;
                                    const nome = layer.tooltipTitle(feature);
                                    return [
                                        ...layer.tooltipLines(feature),
                                        ...mapDataLines(view.level, nome, dataRef.current),
                                    ];
                                },
                            },
                        },
                    },
                    scales: {
                        projection: { axis: "x", projection: layer.projection },
                        color: { type: "color", axis: "x", display: false },
                    },
                },
            });
        };

        layerPromise.then((layer) => {
            if (!isMounted) return;
            rafId = requestAnimationFrame(() => {
                rafId = requestAnimationFrame(() => buildChart(layer));
            });
        });

        return () => {
            isMounted = false;
            if (rafId) cancelAnimationFrame(rafId);
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [nivel]);

    const isWorld = nivel === "pais";

    return (
        <div className="flex flex-row items-start gap-10">
            <div>
                <div className="h-[500px] w-[850px] max-w-full">
                    <canvas ref={canvasRef} />
                </div>
            </div>
            <ul className="list-none m-0 flex flex-col justify-end gap-1 text-[10px] h-[450px]">
                {isWorld &&
                    Object.entries(blocColors)
                        .filter(([key]) => key !== "default")
                        .map(([key, color]) => (
                            <li key={key} className="mb-1 flex items-center gap-2">
                                <span
                                    className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-[#cbcbcb]"
                                    style={
                                        key === "APEC"
                                            ? { backgroundImage: "repeating-linear-gradient(45deg, #9e9e9e 0 1.5px, #ffffff 1.5px 4px)" }
                                            : { backgroundColor: color }
                                    }
                                />
                                <span>{blocLabels[key] ?? key}</span>
                            </li>
                        ))}
                {!isWorld &&
                    Object.entries(regiaoColors).map(([key, color]) => (
                        <li key={key} className="mb-1 flex items-center gap-2">
                            <span className="inline-block h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: color }} />
                            <span>{regiaoLabels[key] ?? key}</span>
                        </li>
                    ))}
            </ul>
        </div>
    );
}
