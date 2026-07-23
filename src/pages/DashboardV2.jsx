import { Funnel, Calendar, RefreshCw, Filter, X, Loader2, Download } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import LevelToggle from '../components/LevelToggle'
import VersionToggle from '../components/VersionToggle'
import FilterSidebar from '../components/FilterSidebar'
import PiauiMapOSM from '../components/PiauiMapOSM'
import EstadoPiauiCard from '../components/EstadoPiauiCard'
import DataTable from '../components/DataTable'
import { formatoNomeProduto } from '../components/CelulaNomeProduto'
import ChartLine from '../components/LineChart'
import Carregando from '../components/Carregando'
import BalancaComercial from '../components/BalancaComercial'
import { formatos } from '../util/formats'
import { baixarJSON, baixarCSV, baixarXLSX } from '../util/downloadsV2'
import { territorioDoMunicipio } from '../util/territoriosPI'
import {
    carregarDatasetV2,
    opcoesFiltrosV2,
    aplicarFiltrosV2,
    filtrarPorEscopo,
    montarDadosMapaV2,
    montarHistoricoAnual,
    montarSetores,
    montarPaisesPorFluxo,
    montarStatsCardV2,
    FILTROS_INICIAIS_V2,
} from '../util/aggregationsV2'

const COLUNAS_SETOR = [
    { chave: 'grupo', label: 'Grupo', alinhamento: 'left' },
    { chave: 'descricao', label: 'Produto', alinhamento: 'left', formato: formatoNomeProduto },
    { chave: 'exportado', label: 'Valor Export. (US$)', formato: formatos.moedaCompacta, total: true },
    { chave: 'importado', label: 'Valor Import. (US$)', formato: formatos.moedaCompacta, total: true },
]
const COLUNAS_PAIS = [
    { chave: 'pais', label: 'País', alinhamento: 'left' },
    { chave: 'municipio', label: 'Município', alinhamento: 'left' },
    { chave: 'produto', label: 'Produto', alinhamento: 'left', formato: formatoNomeProduto },
    { chave: 'valor', label: 'Valor (US$)', formato: formatos.moedaCompacta, total: true },
]
const ROTULO_FLUXO = { Exportacao: 'Exportação', Importacao: 'Importação' }

function TituloSecao({ titulo, descricao }) {
    return (
        <div className="flex flex-col gap-1">
            <h3 className="text-[18px] font-medium text-[#05306a]">{titulo}</h3>
            <p className="text-justify text-[14px] font-light text-black">{descricao}</p>
        </div>
    )
}

function DashboardV2() {
    const [abaAtiva, setAbaAtiva] = useState('balanca-comercial')
    const [filtros, setFiltros] = useState(FILTROS_INICIAIS_V2)
    const [territorios, setTerritorios] = useState([])
    const [municipios, setMunicipios] = useState([])
    const [dataset, setDataset] = useState(null)
    const [erroCarga, setErroCarga] = useState(null)
    const [formatoBaixando, setFormatoBaixando] = useState(null)

    useEffect(() => {
        carregarDatasetV2()
            .then(setDataset)
            .catch((erro) => { console.error('carregarDatasetV2:', erro.message); setErroCarga(erro.message) })
    }, [])

    const mudarTerritorios = (lista) => {
        setTerritorios(lista)
        if (lista.length > 0 && municipios.length > 0) {
            setMunicipios(municipios.filter((municipio) => lista.includes(territorioDoMunicipio(municipio))))
        }
    }
    const mudarMunicipios = (lista) => setMunicipios(lista)

    const opcoesFiltros = useMemo(() => (dataset ? opcoesFiltrosV2(dataset) : null), [dataset])
    const registrosFiltrados = useMemo(() => (dataset ? aplicarFiltrosV2(dataset, filtros) : []), [dataset, filtros])
    const dadosMapa = useMemo(() => (dataset ? montarDadosMapaV2(registrosFiltrados) : null), [dataset, registrosFiltrados])
    const registrosEscopo = useMemo(() => filtrarPorEscopo(registrosFiltrados, territorios, municipios), [registrosFiltrados, territorios, municipios])
    const historico = useMemo(
        () => montarHistoricoAnual(registrosEscopo, { territorios, municipios: territorios.length > 0 ? [] : municipios }),
        [registrosEscopo, territorios, municipios],
    )
    const setores = useMemo(() => montarSetores(registrosEscopo), [registrosEscopo])
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
        chips.push({ chave: `territorio:${territorio}`, rotulo: `Território: ${territorio}`, remover: () => setTerritorios(territorios.filter((t) => t !== territorio)) })
    }
    for (const municipio of municipios) {
        chips.push({ chave: `municipio:${municipio}`, rotulo: `Município: ${municipio}`, remover: () => setMunicipios(municipios.filter((m) => m !== municipio)) })
    }
    for (const fluxo of filtros.fluxo) {
        chips.push({ chave: `fluxo:${fluxo}`, rotulo: `Fluxo: ${ROTULO_FLUXO[fluxo] ?? fluxo}`, remover: () => setFiltros({ ...filtros, fluxo: filtros.fluxo.filter((f) => f !== fluxo) }) })
    }
    for (const pais of filtros.pais) {
        chips.push({ chave: `pais:${pais}`, rotulo: `País: ${pais}`, remover: () => setFiltros({ ...filtros, pais: filtros.pais.filter((p) => p !== pais) }) })
    }
    for (const setor of filtros.setor) {
        chips.push({ chave: `setor:${setor}`, rotulo: `Setor: ${setor}`, remover: () => setFiltros({ ...filtros, setor: filtros.setor.filter((s) => s !== setor) }) })
    }
    for (const grupo of filtros.grupo ?? []) {
        chips.push({ chave: `grupo:${grupo}`, rotulo: `Grupo: ${grupo}`, remover: () => setFiltros({ ...filtros, grupo: filtros.grupo.filter((g) => g !== grupo) }) })
    }
    for (const produto of filtros.produtos) {
        const rotuloProduto = opcoesFiltros?.produtos.find((opcao) => opcao.value === produto)?.label ?? produto
        chips.push({ chave: `produto:${produto}`, rotulo: `Produto: ${rotuloProduto}`, remover: () => setFiltros({ ...filtros, produtos: filtros.produtos.filter((p) => p !== produto) }) })
    }
    if (filtros.inicio || filtros.fim) {
        chips.push({ chave: 'periodo', rotulo: `Período: ${periodo}`, remover: () => setFiltros({ ...filtros, inicio: '', fim: '' }) })
    }

    const barrasInformativas = (
        <>
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

            <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[#d9d9d9] bg-white px-3 py-2">
                <div className="flex items-center gap-2 text-[14px] text-grey-500">
                    <Filter size={16} />
                    <span>Filtros ativos:</span>
                </div>
                {chips.length === 0
                    ? <span className="text-[13px] text-grey-400">Nenhum</span>
                    : chips.map((chip) => (
                        <span key={chip.chave} className="flex items-center gap-1.5 rounded-full bg-secondary-100 px-3 py-1 text-[13px] text-[#232323]">
                            {chip.rotulo}
                            <button type="button" aria-label={`Remover ${chip.rotulo}`} onClick={chip.remover} className="flex">
                                <X size={14} className="text-danger" />
                            </button>
                        </span>
                    ))}
                <button
                    type="button"
                    onClick={limparTudo}
                    className="ml-auto flex items-center gap-1.5 rounded-full border border-danger px-3 py-1 text-[14px] text-danger transition-colors hover:bg-danger hover:text-white"
                >
                    <X size={14} /> Limpar todos
                </button>
            </div>
        </>
    )

    return (
        <>
            <header className="h-[40px] bg-primary flex flex-row items-center justify-between p-5">
                <div>
                    <div className="h-[20px] flex items-center gap-2 px-4 h-full rounded-md bg-secondary-500 hover:bg-primary/80 transition-colors cursor-pointer">
                        <Funnel className="text-white" size={14} />
                        <p className="text-white text-sm">Exportação e Importação do Piauí — v2</p>
                    </div>
                </div>
                <VersionToggle />
            </header>

            {erroCarga && (
                <div className="mx-7 mt-4 rounded-lg border border-danger bg-red-50 px-4 py-3 text-[13px] text-danger">
                    Falha ao carregar dados do banco: {erroCarga}
                </div>
            )}

            <div className="ml-7 mr-7 mt-4 gap-4 flex flex-col pb-10">
                <div className="flex flex-col items-end gap-[10px]">
                    <h1 className="w-full text-[24px] font-medium text-black">Exportação e Importação do Piauí</h1>
                    <LevelToggle value={abaAtiva} onChange={setAbaAtiva} />
                </div>

                {abaBalanca
                    ? <BalancaComercial>{barrasInformativas}</BalancaComercial>
                    : barrasInformativas}

                {!abaBalanca && (
                <div className="flex items-start gap-4">
                    <FilterSidebar
                        filters={filtros}
                        onChange={setFiltros}
                        options={opcoesFiltros}
                        territorios={territorios}
                        onTerritoriosChange={mudarTerritorios}
                        municipios={municipios}
                        onMunicipiosChange={mudarMunicipios}
                    />

                    <div className="sticky top-4 flex h-[calc(100vh-2rem)] min-h-[500px] flex-1 rounded-[10px] border border-[#d9d9d9] bg-white p-4">
                        <PiauiMapOSM
                            data={dadosMapa}
                            territorios={territorios}
                            onTerritoriosChange={mudarTerritorios}
                            municipios={municipios}
                            onMunicipiosChange={mudarMunicipios}
                        />
                    </div>

                    <div className="flex w-[460px] shrink-0 flex-col gap-4">
                        <EstadoPiauiCard stats={statsCard} titulo={tituloCard} carregando={carregando} />

                        <div className="rounded-[10px] border border-[#d9d9d9] bg-white">
                            {carregando
                                ? <Carregando altura="h-[300px]" />
                                : <ChartLine labels={historico.labels} cities={historico.cities} period={periodo} empilhado />}
                        </div>

                        <TituloSecao
                            titulo="Setor econômico e Produtos"
                            descricao={`${tituloCard} movimentou ${setores.length} setores econômicos no período de ${periodo}.`}
                        />
                        {carregando
                            ? <Carregando altura="h-[160px]" />
                            : setores.length === 0
                                ? <p className="text-[13px] text-grey-400">Sem dados para a seleção atual.</p>
                                : setores.map((setor, indice) => (
                                    <DataTable
                                        key={setor.nome}
                                        titulo={setor.nome}
                                        retratil
                                        abertoInicial={indice === 0}
                                        colunas={COLUNAS_SETOR}
                                        linhas={setor.produtos}
                                        altura="max-h-[320px]"
                                    />
                                ))}

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
                                        />
                                    )}
                                </>
                            )}

                        <TituloSecao titulo="Baixar Informações" descricao="Baixe os dados da seleção e filtros atuais nos formatos abaixo" />
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
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        disabled={desabilitado}
                                        onClick={baixar('json', baixarJSON)}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary p-2 text-[15px] font-medium text-white transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Icone formato="json" /> Baixar em JSON
                                    </button>
                                    <button
                                        type="button"
                                        disabled={desabilitado}
                                        onClick={baixar('xlsx', baixarXLSX)}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#9ec8ff] p-2 text-[15px] font-medium text-[#05306a] transition-colors hover:bg-[#8bbcf7] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Icone formato="xlsx" /> Baixar em XLSX
                                    </button>
                                    <button
                                        type="button"
                                        disabled={desabilitado}
                                        onClick={baixar('csv', baixarCSV)}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-[#d9d9d9] p-2 text-[15px] font-medium text-[#05306a] transition-colors hover:bg-secondary-100 disabled:cursor-not-allowed disabled:opacity-50"
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

export default DashboardV2
