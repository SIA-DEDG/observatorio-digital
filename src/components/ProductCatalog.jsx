import { Info } from 'lucide-react'
import DataTable from './DataTable'
import { formatoNomeProduto } from './CelulaNomeProduto'
import { numero, moedaCompacta, numeroCompacto } from '../util/formats'

const formatValue = (value) => (value == null ? '–' : moedaCompacta.format(value))
const formatQuantity = (value) => (value == null ? '–' : `${numeroCompacto.format(value / 1000)} t`)

const ProductName = formatoNomeProduto

function FlowBadge(value) {
  const isExport = value === 'EXPORTAÇÃO'
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${
        isExport ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {value}
    </span>
  )
}

function Tag(code, description) {
  return (
    <span
      title={description}
      className="cursor-help whitespace-nowrap rounded-full border border-dashed border-primary px-2.5 py-0.5 text-[12px] text-primary"
    >
      {code}
    </span>
  )
}

const COLUMNS = [
  { chave: 'product', label: 'Produto', alinhamento: 'left', formato: ProductName },
  { chave: 'flow', label: 'Fluxo', alinhamento: 'left', formato: (value) => FlowBadge(value) },
  { chave: 'ncm', label: 'NCM', alinhamento: 'left', formato: (value, row) => Tag(value, row.ncmDesc) },
  { chave: 'sh4', label: 'SH4', alinhamento: 'left', formato: (value, row) => Tag(value, row.sh4Desc) },
  { chave: 'fobValue', label: 'Valor FOB', formato: formatValue },
  { chave: 'cifValue', label: 'Valor CIF', formato: formatValue },
  { chave: 'quantity', label: 'Quantidade (t)', formato: formatQuantity },
  { chave: 'mainCountry', label: 'País Principal', alinhamento: 'left' },
  { chave: 'mainCity', label: 'Município Principal', alinhamento: 'left' },
]

const DEFAULT_ROWS = [
  { product: 'Quartzo', category: 'Minerals', flow: 'EXPORTAÇÃO', sh4: '2506', sh4Desc: 'Quartzo (exceto areias naturais)', ncm: '25060000', ncmDesc: 'Quartzo em bruto', fobValue: 6.85, cifValue: 7.02, weight: 17056650, quantity: 17.1, mainCountry: 'Paraguai', mainCity: 'São José do Divino' },
  { product: 'Sal marinho', category: 'Agropecuário e Alimentos', flow: 'EXPORTAÇÃO', sh4: '2501', sh4Desc: 'Sal e cloreto de sódio puro', ncm: '25010000', ncmDesc: 'Sal marinho', fobValue: 6.58, cifValue: 6.72, weight: 75234520, quantity: 75.2, mainCountry: 'Chile', mainCity: 'Parnaíba' },
  { product: 'Farinha de mandioca', category: 'Agropecuário e Alimentos', flow: 'EXPORTAÇÃO', sh4: '1106', sh4Desc: 'Farinhas e sêmolas', ncm: '11060000', ncmDesc: 'Farinha de mandioca', fobValue: 6.57, cifValue: 6.68, weight: 10840920, quantity: 10.8, mainCountry: 'Indonésia', mainCity: 'João Costa' },
  { product: 'Gergelim', category: 'Agropecuário e Alimentos', flow: 'EXPORTAÇÃO', sh4: '1207', sh4Desc: 'Sementes e frutos oleaginosos', ncm: '12070600', ncmDesc: 'Sementes de gergelim', fobValue: 6.37, cifValue: 6.52, weight: 4075000, quantity: 4.1, mainCountry: 'França', mainCity: 'Parnaíba' },
  { product: 'Transformadores', category: 'Eletrônicos e Industriais', flow: 'IMPORTAÇÃO', sh4: '8504', sh4Desc: 'Transformadores elétricos', ncm: '85040000', ncmDesc: 'Transformadores de potência', fobValue: 6.34, cifValue: 7.20, weight: 523540, quantity: 0.524, mainCountry: 'Arábia Saudita', mainCity: 'Teresina' },
  { product: 'Móveis de madeira', category: 'Têxtil e Manufaturados', flow: 'EXPORTAÇÃO', sh4: '9403', sh4Desc: 'Móveis e suas partes', ncm: '94030400', ncmDesc: 'Móveis de madeira', fobValue: 6.33, cifValue: 6.48, weight: 2470980, quantity: 2.5, mainCountry: 'Canadá', mainCity: 'Bela Vista do Piauí' },
  { product: 'Resinas plásticas', category: 'Combustíveis e Química', flow: 'IMPORTAÇÃO', sh4: '3901', sh4Desc: 'Polímeros de etileno', ncm: '39010600', ncmDesc: 'Resinas plásticas em formas primárias', fobValue: 6.25, cifValue: 7.06, weight: 3870510, quantity: 3.9, mainCountry: 'Bangladesh', mainCity: 'União' },
  { product: 'Castanha de caju', category: 'Agropecuário e Alimentos', flow: 'EXPORTAÇÃO', sh4: '0801', sh4Desc: 'Cocos, castanhas e nozes', ncm: '08010100', ncmDesc: 'Castanha de caju sem casca', fobValue: 6.19, cifValue: 6.31, weight: 1015940, quantity: 1.0, mainCountry: 'Portugal', mainCity: 'Curimatá' },
  { product: 'Mel natural', category: 'Agropecuário e Alimentos', flow: 'EXPORTAÇÃO', sh4: '0409', sh4Desc: 'Mel natural', ncm: '04090200', ncmDesc: 'Mel natural de abelhas', fobValue: 6.02, cifValue: 6.17, weight: 1723900, quantity: 1.7, mainCountry: 'Alemanha', mainCity: 'Capitão Gervásio Oliveira' },
  { product: 'Irrigação por gotejamento', category: 'Máquinas e Insumos Agrícolas', flow: 'IMPORTAÇÃO', sh4: '8424', sh4Desc: 'Aparelhos mecânicos de pulverização', ncm: '84240600', ncmDesc: 'Sistemas de irrigação por gotejamento', fobValue: 6.01, cifValue: 7.00, weight: 1984240, quantity: 2.0, mainCountry: 'Vietnã', mainCity: 'Beneditinos' },
  { product: 'Defensivos agrícolas', category: 'Máquinas e Insumos Agrícolas', flow: 'IMPORTAÇÃO', sh4: '3808', sh4Desc: 'Inseticidas e fungicidas', ncm: '38080100', ncmDesc: 'Defensivos agrícolas', fobValue: 5.97, cifValue: 6.95, weight: 999520, quantity: 1.0, mainCountry: 'China', mainCity: 'Amarante' },
  { product: 'Castanha de caju torrada', category: 'Agropecuário e Alimentos', flow: 'EXPORTAÇÃO', sh4: '2008', sh4Desc: 'Frutas e outras partes de plantas preparadas', ncm: '20080300', ncmDesc: 'Castanha de caju torrada e salgada', fobValue: 5.95, cifValue: 6.07, weight: 732000, quantity: 0.732, mainCountry: 'México', mainCity: 'Teresina' },
]

export default function ProductCatalog({
  rows = DEFAULT_ROWS,
  period = '2021–2024',
  totalCities = 224,
  totalRecords = 1947,
  municipioMode = false,
}) {
  const colunas = municipioMode ? COLUMNS.filter((coluna) => coluna.chave !== 'mainCountry') : COLUMNS
  return (
    <div className="w-full bg-white p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Catálogo de produtos ({numero.format(rows.length)} itens)
          </h2>
          <p className="text-sm text-gray-500">
            Agregado dos {numero.format(totalCities)} municípios · {period} · {numero.format(totalRecords)} registros
          </p>
        </div>
        <div className="flex max-w-[420px] flex-col gap-1 text-[13px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <Info size={15} className="shrink-0 text-primary" />
            <span>Passe o mouse nos selos NCM/SH4 para ver a descrição.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Info size={15} className="shrink-0 text-primary" />
            <span>
              <strong>{municipioMode ? 'Município Principal' : 'País/Município Principal'}</strong>
              : {municipioMode ? 'município com maior valor negociado do produto.' : 'parceiro e origem/destino com maior valor negociado do produto.'}
            </span>
          </div>
        </div>
      </div>

      <DataTable colunas={colunas} linhas={rows} altura="max-h-[420px]" />
    </div>
  )
}
