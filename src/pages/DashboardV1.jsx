import { useEffect, useMemo, useState } from 'react'
import MapaOSMV1 from '../components/MapaOSMV1'
import PiauiMapOSM from '../components/PiauiMapOSM'
import { territorioDoMunicipio } from '../util/territoriosPI'
import CardChart from '../components/CardChart'
import Card from '../components/Card'
import FilterBar, { INITIAL_STATE } from '../components/FilterBar'
import LevelToggle from '../components/LevelToggle'
import DataTable from '../components/DataTable'
import ChartLine from '../components/LineChart'
import ProductRanking from '../components/ProductRanking'
import MunicipalityComparison from '../components/MunicipalityComparison'
import ProductCatalog from '../components/ProductCatalog'
import { formatos, moedaCompacta, numeroCompacto, numero } from '../util/formats'
import { loadDataset, selectRecords, applyFilters, summaryByCountry, cardsTotals, filterOptions, buildLineChart, buildMapData, buildProductRanking, buildCatalog, buildMunicipioComparison, normKey } from '../util/aggregations'
import { Funnel } from 'lucide-react'
import VersionToggle from '../components/VersionToggle'
import Carregando from '../components/Carregando'
import BalancaComercial from '../components/BalancaComercial'

const COLUNAS_COMPARATIVO = [
  { chave: 'local', label: 'Local' },
  { chave: 'exportado', label: 'Exportado (FOB)', formato: formatos.moedaCompacta },
  { chave: 'importado', label: 'Importado (FOB)', formato: formatos.moedaCompacta },
  { chave: 'saldo', label: 'Saldo Comercial', formato: formatos.moedaCompacta },
]

const colunasDetalhe = (geoLabel) => [
  { chave: 'blocos_economicos', label: 'Blocos Econômicos' },
  { chave: 'pais', label: geoLabel },
  { chave: 'exportado', label: 'Exportado (FOB)', formato: formatos.moedaCompacta, total: true },
  { chave: 'importado', label: 'Importado (FOB)', formato: formatos.moedaCompacta, total: true },
  { chave: 'qtd_exportacao', label: 'Quantidade Exportação', formato: formatos.toneladas, total: true },
  { chave: 'qtd_importacao', label: 'Quantidade Importação', formato: formatos.toneladas, total: true },
]

function DashboardV1() {
  const [abaAtiva, setAbaAtiva] = useState('balanca-comercial')
  const [filtros, setFiltros] = useState(INITIAL_STATE)
  const [territorios, setTerritorios] = useState([])
  const [dataset, setDataset] = useState(null)
  const [erroCarga, setErroCarga] = useState(null)

  useEffect(() => {
    loadDataset()
      .then(setDataset)
      .catch((erro) => { console.error('loadDataset:', erro.message); setErroCarga(erro.message) })
  }, [])

  const municipioMode = filtros.nivel === 'piaui'
  const geoLabel = municipioMode ? 'Município' : 'País'
  const datasetAtivo = useMemo(
    () => (dataset ? { ...dataset, records: selectRecords(dataset, filtros.nivel) } : null),
    [dataset, filtros.nivel],
  )

  useEffect(() => {
    if (!municipioMode && territorios.length > 0) setTerritorios([])
  }, [municipioMode, territorios])

  const mudarTerritorios = (lista) => {
    setTerritorios(lista)
    if (lista.length > 0 && filtros.pais.length > 0) setFiltros({ ...filtros, pais: [] })
  }
  const mudarFiltros = (novos) => {
    setFiltros(novos)
    if (municipioMode && novos.pais.length > 0 && territorios.length > 0) setTerritorios([])
  }
  const mudarMunicipios = (lista) => mudarFiltros({ ...filtros, pais: lista })

  const opcoesFiltros = useMemo(() => (dataset ? filterOptions(dataset) : null), [dataset])
  const registrosFiltradosSemEscopo = useMemo(() => (datasetAtivo ? applyFilters(datasetAtivo, filtros) : []), [datasetAtivo, filtros])
  const registrosFiltrados = useMemo(
    () => (municipioMode && territorios.length > 0
      ? registrosFiltradosSemEscopo.filter((registro) => territorios.includes(territorioDoMunicipio(registro.pais)))
      : registrosFiltradosSemEscopo),
    [registrosFiltradosSemEscopo, municipioMode, territorios],
  )
  const linhasPorPais = useMemo(() => summaryByCountry(registrosFiltrados), [registrosFiltrados])
  const totaisCards = useMemo(() => (datasetAtivo ? cardsTotals(registrosFiltrados) : null), [datasetAtivo, registrosFiltrados])
  const dadosGraficoLinha = useMemo(
    () => (datasetAtivo ? buildLineChart(datasetAtivo, registrosFiltrados, filtros, municipioMode ? territorios : null) : { labels: [], cities: [] }),
    [datasetAtivo, registrosFiltrados, filtros, municipioMode, territorios],
  )
  const colunas = useMemo(() => colunasDetalhe(geoLabel), [geoLabel])

  const visaoMapa = filtros.nivel === 'brasil' ? 'estado' : filtros.nivel === 'piaui' ? 'municipios' : 'pais'
  const dadosMapa = useMemo(
    () => (dataset ? buildMapData(dataset, linhasPorPais, totaisCards, filtros) : null),
    [dataset, linhasPorPais, totaisCards, filtros],
  )
  const ranking = useMemo(() => buildProductRanking(registrosFiltrados, filtros), [registrosFiltrados, filtros])

  const comparativoPiBrasil = useMemo(() => {
    if (!dadosMapa || !totaisCards) return []
    const brasil = dadosMapa.byCountry[normKey('Brasil')] ?? { exportado: 0, importado: 0 }
    return [
      { local: 'Piauí', exportado: totaisCards.exportado_fob, importado: totaisCards.importado_fob, saldo: totaisCards.exportado_fob - totaisCards.importado_fob },
      { local: 'Brasil', exportado: brasil.exportado, importado: brasil.importado, saldo: brasil.exportado - brasil.importado },
    ]
  }, [dadosMapa, totaisCards])
  const comparativoMunicipios = useMemo(
    () => (dataset ? buildMunicipioComparison(dataset, filtros, 5, municipioMode ? territorios : null) : []),
    [dataset, filtros, municipioMode, territorios],
  )
  const catalogo = useMemo(() => (dataset ? buildCatalog(dataset, registrosFiltrados) : []), [dataset, registrosFiltrados])
  const periodo = filtros.inicio || filtros.fim ? `${filtros.inicio || '...'} a ${filtros.fim || '...'}` : 'todo o período'

  const abaBalanca = abaAtiva === 'balanca-comercial'

  return (
    <>
      <header className="h-[40px] bg-primary flex flex-row items-center justify-between p-5">
        <div>
          <div className="h-[20px] flex items-center gap-2 px-4 h-full rounded-md bg-secondary-500 hover:bg-primary/80 transition-colors cursor-pointer">
            <Funnel className="text-white" size={14} />
            <p className="text-white text-sm">Exportação e Importação do Piauí</p>
          </div>
        </div>
        <VersionToggle />
      </header>

      {erroCarga && (
        <div className="mx-7 mt-4 rounded-lg border border-danger bg-red-50 px-4 py-3 text-[13px] text-danger">
          Falha ao carregar dados do banco: {erroCarga}
        </div>
      )}

      <div className="ml-7 mr-7 mt-4 gap-4 flex flex-col">
        {!abaBalanca && (
        <section className="flex flex-col gap-1 py-5">
          <div className="flex w-full flex-nowrap items-stretch gap-[8px] overflow-x-auto px-1 pt-1 pb-2">
            <Card title="Produtos" value={totaisCards ? numero.format(totaisCards.produtos) : '—'} color="#0E50A6" />
            <Card title="Saldo Comercial" value={totaisCards ? moedaCompacta.format(totaisCards.saldo) : '—'} color="#0E50A6" />

            <Card
              title="Valor Exportado"
              value={totaisCards ? moedaCompacta.format(totaisCards.exportado_fob) : '—'}
              color="#0E50A6"
              multi
              description={[
                { label: "Valor FOB (US$)", value: totaisCards ? moedaCompacta.format(totaisCards.exportado_fob) : '—' },
                { label: "Valor CIF (US$)", value: totaisCards ? moedaCompacta.format(totaisCards.exportado_cif ?? 0) : '—', caption: "Frete+seguro incluídos" },
              ]}
            />

            <Card
              title="Valor Importado"
              value={totaisCards ? moedaCompacta.format(totaisCards.importado_fob) : '—'}
              color="#0E50A6"
              multi
              description={[
                { label: "Valor FOB (US$)", value: totaisCards ? moedaCompacta.format(totaisCards.importado_fob) : '—' },
                { label: "Valor CIF (US$)", value: totaisCards ? moedaCompacta.format(totaisCards.importado_cif) : '—', caption: "Frete+seguro incluídos" },
              ]}
            />

            <Card
              title="Quantidade total"
              value={totaisCards ? `${numeroCompacto.format((Number(totaisCards.qtd_exportacao) + Number(totaisCards.qtd_importacao)) / 1000)} t` : '—'}
              color="#0E50A6"
              multi
              description={[
                { label: "Quantidade Importada", value: totaisCards ? `${numeroCompacto.format(totaisCards.qtd_importacao / 1000)} t` : '—' },
                { label: "Quantidade Exportada", value: totaisCards ? `${numeroCompacto.format(totaisCards.qtd_exportacao / 1000)} t` : '—' },
              ]}
            />
          </div>
        </section>
        )}

        <div className="flex justify-end">
          <LevelToggle value={abaAtiva} onChange={setAbaAtiva} />
        </div>

        {!abaBalanca && (
          <FilterBar
            filters={filtros}
            onChange={mudarFiltros}
            options={opcoesFiltros}
            territorios={territorios}
            onTerritoriosChange={mudarTerritorios}
          />
        )}

        {abaBalanca && <BalancaComercial />}

        {!abaBalanca && (
        <>
        <CardChart>
          {!dataset ? <Carregando altura="h-[420px]" /> : (
            <>
              <div className="flex flex-col items-center gap-3 py-5">
                <h2 className="w-full text-lg font-semibold text-[#232323]">MAPA DE EXPORTAÇÃO E IMPORTAÇÃO</h2>
                {visaoMapa === 'municipios' ? (
                  <div className="h-[560px] w-full">
                    <PiauiMapOSM
                      data={dadosMapa?.byMunicipio}
                      territorios={territorios}
                      onTerritoriosChange={mudarTerritorios}
                      municipios={filtros.pais}
                      onMunicipiosChange={mudarMunicipios}
                    />
                  </div>
                ) : (
                  <MapaOSMV1 nivel={visaoMapa} data={dadosMapa} />
                )}
              </div>

              <div className="flex flex-col gap-3 pb-8">
                {visaoMapa === 'estado'
                  ? <DataTable titulo="Comparativo Piauí × Brasil" retratil colunas={COLUNAS_COMPARATIVO} linhas={comparativoPiBrasil} />
                  : <DataTable titulo="Detalhamento" retratil colunas={colunas} linhas={linhasPorPais} />}
              </div>
            </>
          )}
        </CardChart>

        <CardChart>
          {!dataset ? <Carregando altura="h-[300px]" /> : (
            <ChartLine labels={dadosGraficoLinha.labels} cities={dadosGraficoLinha.cities} period={periodo} />
          )}
        </CardChart>

        {municipioMode && (
          <CardChart>
            {!dataset ? <Carregando /> : <MunicipalityComparison rows={comparativoMunicipios} period={periodo} />}
          </CardChart>
        )}

        <CardChart>
          {!dataset ? <Carregando /> : <ProductRanking cities={ranking} period={periodo} />}
        </CardChart>

        <CardChart>
          {!dataset ? <Carregando /> : (
            <ProductCatalog rows={catalogo} period={periodo} totalRecords={registrosFiltrados.length} municipioMode={municipioMode} />
          )}
        </CardChart>
        </>
        )}
      </div>
    </>
  )
}

export default DashboardV1
