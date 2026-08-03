import { CORES_TERRITORIO } from '../util/territoriosPI.js'
import { useTema } from './useTema.js'

/*
 * Cor de visualização — Chart.js, Leaflet e o treemap recebem cor por objeto de
 * opções, não por classe CSS, então nada disso cabe nos tokens do index.css.
 * A divisão é limpa: o CSS é dono do cromo, este arquivo é dono do dado. Não há
 * valor repetido entre os dois.
 *
 * Todo contraste anotado abaixo é medido; scripts/contraste.mjs falha o build se
 * alguma combinação escorregar.
 */

/*
 * Paleta categórica validada (ordem fixa, nunca reciclada). São as mesmas oito
 * matizes de referência, porém com o croma reduzido em 20% e a luminosidade
 * resolvida para 5:1 contra o branco: aqui a cor é área cheia, não traço fino,
 * então o tom claro cansa a vista e ainda deixaria o rótulo ilegível — na
 * paleta anterior o texto branco chegava a 2,17:1 sobre o amarelo.
 * A ordem saiu de uma busca entre as 96 permutações que passam todos os gates.
 *
 * A mesma paleta serve os dois temas: medida contra o card escuro (#161C23) o
 * pior bloco dá 3,41:1, acima do gate de 3:1 do WCAG 1.4.11, e a tinta branca
 * segue nos 5:1. Refazer a busca para o escuro só trocaria a identidade do
 * gráfico sem ganho de legibilidade.
 */
const CORES_TREEMAP = ['#b5512b', '#3770ba', '#a75575', '#2f7f2b', '#6965bd', '#be4844', '#0d7f58', '#9c6300']

// Só as três matizes que não alcançam 3:1 compostas sobre o basemap escuro
const TERRITORIOS_ESCURO = {
    ...CORES_TERRITORIO,
    'Carnaubais': '#D9A441', // era #a16207 — 2,69:1 a 0,9 de opacidade
    'Chapada do Vale do Itaim': '#A8A29E', // era #78716c — 2,76:1
    'Tabuleiros do Alto Parnaíba': '#818CF8', // era #6366f1 — 2,91:1
}

const TILE_OSM = {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: 'tiles-fundo-neutro',
    subdomains: 'abc',
}

// Basemap desenhado para fundo escuro: filtrar o OSM claro quebra rótulo e halo
const TILE_CARTO_ESCURO = {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    className: undefined,
    subdomains: 'abcd',
}

export const PALETAS = {
    light: {
        grafico: {
            saldoTradicional: '#1661C3',
            saldoRecorte: '#E5940A',
            exportacao: '#2563eb',
            importacao: '#f59e0b',
            grade: '#e5e7eb',
            ticks: '#6b7280',
            bordaEixo: '#8e8e93',
            contornoPonto: '#ffffff',
        },
        treemap: {
            cores: CORES_TREEMAP,
            caudaCategorica: '#78716c',
            caudaRampa: '#78716c',
            tintaCategorica: '#ffffff',
            tintaRampa: '#ffffff',
            // A rampa sempre se afasta da superfície do card; no claro, isso é escurecer
            rampa: { direcao: 'escurecer', inicio: 0, fim: 0.38 },
        },
        mapa: {
            tile: TILE_OSM,
            // Média aproximada do tile OSM depois do filtro .tiles-fundo-neutro;
            // serve de referência para a auditoria de contraste dos polígonos.
            fundoBasemap: '#C8C8C8',
            territorios: CORES_TERRITORIO,
            semTerritorio: '#d1d5db',
            contornoEstado: '#6b7280',
            divisa: '#ffffff',
            pesoDivisa: 1,
            destaqueHover: '#0e50a6',
            pesoHover: 2,
            opacidadeDentro: 0.75,
            opacidadeFora: 0.2,
            opacidadeSelecionado: 0.9,
            // Selecionado se afasta do basemap claro escurecendo
            selecao: { direcao: 'escurecer', fator: 0.45 },
        },
    },

    dark: {
        grafico: {
            saldoTradicional: '#5B9CF6', // 6,15:1 sobre superficie-1
            saldoRecorte: '#F0A93C', // 8,53:1
            exportacao: '#63A0F0', // 6,38:1
            importacao: '#FFB454', // 9,73:1
            grade: '#2A323C',
            ticks: '#939EAC', // 6,31:1
            bordaEixo: '#3A444F',
            contornoPonto: '#161C23',
        },
        treemap: {
            cores: CORES_TREEMAP,
            caudaCategorica: '#6E7681', // 3,73:1 vs card, tinta branca 4,59:1
            caudaRampa: '#A8A29E', // 6,80:1 vs card, tinta escura 7,34:1
            tintaCategorica: '#ffffff', // 5,00:1 sobre os blocos
            tintaRampa: '#0F1419', // 4,88:1 -> 10,59:1 ao longo da rampa
            /*
             * Escurecer aqui levaria a ponta da rampa abaixo de 3:1 contra o card.
             * Clareando, o bloco vai de 4,52:1 a 9,81:1 — e a tinta acompanha,
             * virando escura: a rampa se afasta da superfície, a tinta é o polo
             * oposto. Começa em 0.15 porque o passo 0 ainda pediria tinta branca.
             */
            rampa: { direcao: 'clarear', inicio: 0.15, fim: 0.6 },
        },
        mapa: {
            tile: TILE_CARTO_ESCURO,
            fundoBasemap: '#0E0E0E', // fundo declarado do CARTO Dark Matter
            territorios: TERRITORIOS_ESCURO,
            semTerritorio: '#4A5665',
            contornoEstado: '#E8EDF2', // 16,39:1 sobre o basemap #0E0E0E
            divisa: 'rgba(255,255,255,0.35)',
            pesoDivisa: 1,
            // Branco também para o hover: separa-se da divisa pelo peso, não pela cor
            destaqueHover: '#FFFFFF',
            pesoHover: 3,
            // 0,75 deixaria o pior território em 2,69:1 contra o basemap; 0,9 dá 3,39:1
            opacidadeDentro: 0.9,
            // 0,2 some por completo no escuro
            opacidadeFora: 0.45,
            opacidadeSelecionado: 1,
            selecao: { direcao: 'clarear', fator: 0.3 },
        },
    },
}

export const usePaleta = () => PALETAS[useTema()]
