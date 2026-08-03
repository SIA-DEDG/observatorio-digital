import { Funnel, Calendar, RefreshCw, Loader2, Download } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import LevelToggle from '../components/LevelToggle'
import FilterSidebar from '../components/FilterSidebar'
import PiauiMapOSM from '../components/PiauiMapOSM'
import EstadoPiauiCard from '../components/EstadoPiauiCard'
import BandeiraPais from '../components/BandeiraPais'
import DataTable from '../components/DataTable'
import { formatoNomeProduto } from '../components/CelulaNomeProduto'
import ChartLine from '../components/LineChart'
import Carregando from '../components/Carregando'
import BalancaComercial from '../components/BalancaComercial'
import BarraFiltrosAtivos from '../components/BarraFiltrosAtivos'
import TopPaises from '../components/TopPaises'
import { formatos } from '../util/formats'
import { countryNamesPt } from '../util/countryNames'
import { baixarJSON, baixarCSV, baixarXLSX } from '../util/downloadsV2'
import { territorioDoMunicipio } from '../util/territoriosPI'
import {
    carregarDatasetV2,
    carregarCatalogoNcm,
    opcoesFiltrosV2,
    aplicarFiltrosV2,
    filtrarEconomiaDigital,
    filtrarPorEscopo,
    montarDadosMapaV2,
    montarHistoricoAnual,
    montarPaisesPorFluxo,
    montarStatsCardV2,
    FILTROS_INICIAIS_V2,
} from '../util/aggregationsV2'

// A célula do produto traz o botão de expandir; centraliza o conjunto na coluna
const formatoProduto = (valor) => <span className="flex justify-center">{formatoNomeProduto(valor)}</span>

const formatoPais = (valor) => (
    <span className="flex items-center justify-center gap-[6px]">
        <BandeiraPais pais={valor} />
        {countryNamesPt[valor] ?? valor}
    </span>
)

const COLUNAS_PAIS = [
    { chave: 'pais', label: 'Nome do país', alinhamento: 'center', formato: formatoPais },
    { chave: 'municipio', label: 'Nome do município', alinhamento: 'center' },
    { chave: 'periodo', label: 'Período', alinhamento: 'center' },
    { chave: 'grupo', label: 'Grupo temático', alinhamento: 'center' },
    { chave: 'produto', label: 'Nome do produto', alinhamento: 'center', formato: formatoProduto },
    { chave: 'exportado', label: 'Valor exportado (US$)', formato: formatos.moedaCompacta, total: true },
    { chave: 'kgExportado', label: 'Quant. exportada (t)', formato: formatos.toneladas, total: true },
    { chave: 'importado', label: 'Valor importado (US$)', formato: formatos.moedaCompacta, total: true },
    { chave: 'kgImportado', label: 'Quant. importada (t)', formato: formatos.toneladas, total: true },
]
const ROTULO_FLUXO = { Exportacao: 'Exportação', Importacao: 'Importação' }

function TituloSecao({ titulo, descricao }) {
    return (
        <div className="flex flex-col gap-[6px]">
            <h3 className="text-[18px] font-medium text-[#05306a]">{titulo}</h3>
            <p className="text-justify text-[16px] font-light text-black">{descricao}</p>
        </div>
    )
}

function Dashboard() {
    const [abaAtiva, setAbaAtiva] = useState('balanca-comercial')
    const [filtros, setFiltros] = useState(FILTROS_INICIAIS_V2)
    const [territorios, setTerritorios] = useState([])
    const [municipios, setMunicipios] = useState([])
    const [dataset, setDataset] = useState(null)
    const [catalogoNcm, setCatalogoNcm] = useState([])
    const [classificacao, setClassificacao] = useState('NCM')
    const [erroCarga, setErroCarga] = useState(null)
    const [formatoBaixando, setFormatoBaixando] = useState(null)

    useEffect(() => {
        Promise.all([carregarDatasetV2(), carregarCatalogoNcm()])
            .then(([registros, ncms]) => { setDataset(registros); setCatalogoNcm(ncms) })
            .catch((erro) => { console.error('carregarDatasetV2:', erro.message); setErroCarga(erro.message) })
    }, [])

    const mudarTerritorios = (lista) => {
        setTerritorios(lista)
        if (lista.length > 0 && municipios.length > 0) {
            setMunicipios(municipios.filter((municipio) => lista.includes(territorioDoMunicipio(municipio))))
        }
    }
    const mudarMunicipios = (lista) => setMunicipios(lista)

    /*
     * A tela inteira é o recorte da Economia Digital (grupo do Quadro 8), igual
     * à Balança Comercial. O corte entra aqui, na origem, então filtros, mapa,
     * gráfico, tabelas, card e downloads herdam o recorte de um lugar só.
     */
    const economiaDigital = useMemo(() => (dataset ? filtrarEconomiaDigital(dataset) : []), [dataset])

    const opcoesFiltros = useMemo(() => (dataset ? opcoesFiltrosV2(economiaDigital) : null), [dataset, economiaDigital])
    const registrosFiltrados = useMemo(() => aplicarFiltrosV2(economiaDigital, filtros), [economiaDigital, filtros])
    const dadosMapa = useMemo(() => (dataset ? montarDadosMapaV2(registrosFiltrados) : null), [dataset, registrosFiltrados])
    const registrosEscopo = useMemo(() => filtrarPorEscopo(registrosFiltrados, territorios, municipios), [registrosFiltrados, territorios, municipios])
    const historico = useMemo(
        () => montarHistoricoAnual(registrosEscopo, { territorios, municipios: territorios.length > 0 ? [] : municipios }),
        [registrosEscopo, territorios, municipios],
    )
    const paises = useMemo(() => montarPaisesPorFluxo(registrosEscopo), [registrosEscopo])
    const statsCard = useMemo(() => (dataset ? montarStatsCardV2(registrosEscopo) : null), [dataset, registrosEscopo])

    const abaBalanca = abaAtiva === 'balanca-comercial'
    const carregando = !dataset && !erroCarga
    const mostrarExportacao = filtros.fluxo.length === 0 || filtros.fluxo.includes('Exportacao')
    const mostrarImportacao = filtros.fluxo.length === 0 || filtros.fluxo.includes('Importacao')

    const paisFiltrado = filtros.pais.length > 0
    const nomesPaises = filtros.pais.join(', ')
    const periodo = filtros.inicio || filtros.fim ? `${filtros.inicio || '...'} a ${filtros.fim || '...'}` : 'todo o período'
    const tituloCard = municipios.length > 0
        ? municipios.join(', ')
        : territorios.length > 0 ? territorios.join(', ') : 'Estado do Piauí'

    const limparTudo = () => {
        setFiltros(FILTROS_INICIAIS_V2)
        setTerritorios([])
        setMunicipios([])
    }

    const chips = []
    for (const territorio of territorios) {
        chips.push({ chave: `territorio:${territorio}`, rotulo: `Território: ${territorio}`, remover: () => setTerritorios(territorios.filter((item) => item !== territorio)) })
    }
    for (const municipio of municipios) {
        chips.push({ chave: `municipio:${municipio}`, rotulo: `Município: ${municipio}`, remover: () => setMunicipios(municipios.filter((item) => item !== municipio)) })
    }
    for (const fluxo of filtros.fluxo) {
        chips.push({ chave: `fluxo:${fluxo}`, rotulo: `Fluxo: ${ROTULO_FLUXO[fluxo] ?? fluxo}`, remover: () => setFiltros({ ...filtros, fluxo: filtros.fluxo.filter((item) => item !== fluxo) }) })
    }
    for (const pais of filtros.pais) {
        chips.push({ chave: `pais:${pais}`, rotulo: `País: ${pais}`, remover: () => setFiltros({ ...filtros, pais: filtros.pais.filter((item) => item !== pais) }) })
    }
    for (const setor of filtros.setor) {
        chips.push({ chave: `setor:${setor}`, rotulo: `Setor: ${setor}`, remover: () => setFiltros({ ...filtros, setor: filtros.setor.filter((item) => item !== setor) }) })
    }
    for (const grupo of filtros.grupo ?? []) {
        chips.push({ chave: `grupo:${grupo}`, rotulo: `Grupo: ${grupo}`, remover: () => setFiltros({ ...filtros, grupo: filtros.grupo.filter((item) => item !== grupo) }) })
    }
    for (const produto of filtros.produtos) {
        const rotuloProduto = opcoesFiltros?.produtos.find((opcao) => opcao.value === produto)?.label ?? produto
        chips.push({ chave: `produto:${produto}`, rotulo: `Produto: ${rotuloProduto}`, remover: () => setFiltros({ ...filtros, produtos: filtros.produtos.filter((item) => item !== produto) }) })
    }
    if (filtros.inicio || filtros.fim) {
        chips.push({ chave: 'periodo', rotulo: `Período: ${periodo}`, remover: () => setFiltros({ ...filtros, inicio: '', fim: '' }) })
    }

    // Barra compartilhada pelas duas abas; os chips de filtro são montados por aba
    const barraAtualizacao = (
        <div className="flex overflow-hidden rounded-[8px]">
            <div className="w-1.5 bg-primary" />
            <div className="flex flex-1 flex-wrap items-center gap-x-10 gap-y-2 bg-secondary-100 px-4 py-3">
                <div className="flex items-center gap-2 text-[14px] text-grey-500">
                    <Calendar size={18} className="text-primary" />
                    <span>Período dos dados: <strong className="text-[#232323]">01/03/2020 a 26/02/2025</strong></span>
                </div>
                <div className="flex items-center gap-2 text-[14px] text-grey-500">
                    <RefreshCw size={16} className="text-primary" />
                    <span>Atualizado: <strong className="text-[#232323]">01/08/2026, 10:34</strong></span>
                </div>
            </div>
        </div>
    )

    return (
        <>
            <header className="h-[40px] bg-primary flex flex-row items-center justify-between p-5">
                <div>
                    <div className="h-[20px] flex items-center gap-2 px-4 h-full rounded-md bg-secondary-500 hover:bg-primary/80 transition-colors cursor-pointer">
                        <Funnel className="text-white" size={14} />
                        <p className="text-white text-sm">Exportação e Importação do Piauí</p>
                    </div>
                </div>
            </header>

            {erroCarga && (
                <div className="mx-4 mt-4 rounded-lg border border-danger bg-red-50 px-4 py-3 text-[13px] text-danger lg:mx-7">
                    Falha ao carregar dados do banco: {erroCarga}
                </div>
            )}

            <div className="mx-4 mt-4 gap-4 flex flex-col pb-10 lg:mx-7">
                <div className="flex flex-col items-end gap-[10px]">
                    <h1 className="w-full text-[20px] font-medium text-black lg:text-[24px]">Exportação e Importação do Piauí</h1>
                    <LevelToggle value={abaAtiva} onChange={setAbaAtiva} />
                </div>

                {abaBalanca
                    ? <BalancaComercial>{barraAtualizacao}</BalancaComercial>
                    : (
                        <>
                            {barraAtualizacao}
                            <BarraFiltrosAtivos chips={chips} onLimparTudo={limparTudo} />
                        </>
                    )}

                {!abaBalanca && (
                // Empilha abaixo de lg: botão de filtro, mapa e só então a coluna lateral
                <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-start">
                    <FilterSidebar
                        filters={filtros}
                        onChange={setFiltros}
                        options={opcoesFiltros}
                        territorios={territorios}
                        onTerritoriosChange={mudarTerritorios}
                        municipios={municipios}
                        onMunicipiosChange={mudarMunicipios}
                        catalogoNcm={catalogoNcm}
                        classificacao={classificacao}
                        onClassificacaoChange={(modo) => { setClassificacao(modo); setFiltros({ ...filtros, produtos: [] }) }}
                        chips={chips}
                        onLimpar={limparTudo}
                    />

                    <div className="mx-auto flex h-[420px] w-full max-w-[640px] rounded-[10px] border border-[#d9d9d9] bg-white p-3 lg:sticky lg:top-4 lg:mx-0 lg:h-[calc(100vh-2rem)] lg:min-h-[500px] lg:max-w-none lg:flex-1 lg:p-4">
                        <PiauiMapOSM
                            data={dadosMapa}
                            territorios={territorios}
                            onTerritoriosChange={mudarTerritorios}
                            municipios={municipios}
                            onMunicipiosChange={mudarMunicipios}
                        />
                    </div>

                    <div className="flex w-full min-w-0 flex-col gap-4 lg:w-[532px] lg:shrink-0">
                        <EstadoPiauiCard stats={statsCard} titulo={tituloCard} carregando={carregando} />

                        <div className="rounded-[10px] border border-[#d9d9d9] bg-white">
                            {carregando
                                ? <Carregando altura="h-[300px]" />
                                : <ChartLine labels={historico.labels} cities={historico.cities} period={periodo} empilhado />}
                        </div>

                        <TituloSecao
                            titulo="Países"
                            descricao={paisFiltrado
                                ? `Municípios do Piauí que exportam para ou importam de ${nomesPaises} no período de ${periodo}.`
                                : `Principais movimentações de ${tituloCard} por país no período de ${periodo}.`}
                        />
                        {carregando
                            ? <Carregando altura="h-[160px]" />
                            : (
                                <>
                                    {mostrarExportacao && (
                                        <DataTable
                                            titulo={paisFiltrado ? `Exportação para ${nomesPaises}` : 'Exportação'}
                                            retratil
                                            colunas={COLUNAS_PAIS}
                                            linhas={paises.exportacao}
                                            altura="max-h-[320px]"
                                            cabecalhoExtra={<TopPaises linhas={paises.exportacao} />}
                                        />
                                    )}
                                    {mostrarImportacao && (
                                        <DataTable
                                            titulo={paisFiltrado ? `Importação de ${nomesPaises}` : 'Importação'}
                                            retratil
                                            abertoInicial={!mostrarExportacao}
                                            colunas={COLUNAS_PAIS}
                                            linhas={paises.importacao}
                                            altura="max-h-[320px]"
                                            cabecalhoExtra={<TopPaises linhas={paises.importacao} />}
                                        />
                                    )}
                                </>
                            )}

                        <TituloSecao titulo="Baixar Informações" descricao="Baixe as informações acima nos formatos abaixo" />
                        {(() => {
                            const baixar = (formato, gerarArquivo) => async () => {
                                setFormatoBaixando(formato)
                                try {
                                    await gerarArquivo(registrosEscopo)
                                } catch (erro) {
                                    console.error(`baixar ${formato}:`, erro)
                                    alert(`Falha ao gerar o ${formato.toUpperCase()}: ${erro.message}`)
                                } finally {
                                    setFormatoBaixando(null)
                                }
                            }
                            const desabilitado = carregando || registrosEscopo.length === 0 || formatoBaixando !== null
                            const Icone = ({ formato }) => formatoBaixando === formato
                                ? <Loader2 size={16} className="animate-spin" />
                                : <Download size={16} />
                            return (
                                <div className="flex flex-col gap-[13px] sm:flex-row">
                                    <button
                                        type="button"
                                        disabled={desabilitado}
                                        onClick={baixar('json', baixarJSON)}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-[rgba(217,217,217,0.85)] bg-primary p-[10px] text-[16px] font-medium text-white transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Icone formato="json" /> Baixar em JSON
                                    </button>
                                    <button
                                        type="button"
                                        disabled={desabilitado}
                                        onClick={baixar('xlsx', baixarXLSX)}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-[#d9d9d9] bg-[#9ec8ff] p-[10px] text-[16px] font-medium text-[#05306a] transition-colors hover:bg-[#8bbcf7] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Icone formato="xlsx" /> Baixar em XLSX
                                    </button>
                                    <button
                                        type="button"
                                        disabled={desabilitado}
                                        onClick={baixar('csv', baixarCSV)}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-[#d9d9d9] p-[10px] text-[16px] font-medium text-[#05306a] transition-colors hover:bg-secondary-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Icone formato="csv" /> Baixar em CSV
                                    </button>
                                </div>
                            )
                        })()}
                    </div>
                </div>
                )}
            </div>
        </>
    )
}

export default Dashboard
