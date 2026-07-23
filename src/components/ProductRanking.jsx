import { useState } from 'react'
import { Layers, Rows3 } from 'lucide-react'
import { moedaCompacta, numeroCompacto } from '../util/formats'

const EXPORT_COLOR = '#0E50A6'
const IMPORT_COLOR = '#f59e0b'

const formatValue = (value) => moedaCompacta.format(value)
const formatQuantity = (quantity) => `${numeroCompacto.format(quantity / 1000)} t`

const sampleProducts = () =>
  Array.from({ length: 5 }, () => ({
    name: 'Cera de abelha',
    value: 6.26,
    quantity: 34.6,
  }))

const DEFAULT_CITIES = [
  {
    name: 'Município',
    exports: sampleProducts(),
    imports: sampleProducts(),
  },
]

const COLUMNS = [
  { title: 'Exportação • Valor', flow: 'exports', metric: 'value', color: EXPORT_COLOR },
  { title: 'Exportação • Quantidade', flow: 'exports', metric: 'quantity', color: EXPORT_COLOR },
  { title: 'Importação • Valor', flow: 'imports', metric: 'value', color: IMPORT_COLOR },
  { title: 'Importação • Quantidade', flow: 'imports', metric: 'quantity', color: IMPORT_COLOR },
]

function ProductRow({ position, product, metric, color, max }) {
  const barWidth = max > 0 ? `${(product[metric] / max) * 100}%` : '0%'

  const highlight = metric === 'value' ? formatValue(product.value) : formatQuantity(product.quantity)
  const secondary = metric === 'value' ? formatQuantity(product.quantity) : formatValue(product.value)

  return (
    <div className="flex items-start gap-3">
      <span className="w-4 shrink-0 text-sm font-semibold text-gray-400">{position}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-gray-800">{product.name}</p>
        <div className="my-1.5 h-2 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
          <div className="h-full rounded-full" style={{ width: barWidth, backgroundColor: color }} />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{secondary}</span>
          <span className="font-semibold text-gray-700">{highlight}</span>
        </div>
      </div>
    </div>
  )
}

function mergeProducts(products) {
  const produtosPorNome = new Map()
  for (const product of products) {
    const atual = produtosPorNome.get(product.name) ?? { name: product.name, value: 0, quantity: 0 }
    atual.value += product.value
    atual.quantity += product.quantity
    produtosPorNome.set(product.name, atual)
  }
  return [...produtosPorNome.values()]
}

function RankingColumn({ title, products, metric, color }) {
  const top5 = [...products].sort((a, b) => b[metric] - a[metric]).slice(0, 5)
  const max = top5.length > 0 ? top5[0][metric] : 0

  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
      {top5.map((product, index) => (
        <ProductRow
          key={`${product.name}-${index}`}
          position={index + 1}
          product={product}
          metric={metric}
          color={color}
          max={max}
        />
      ))}
    </div>
  )
}

function RankingBlock({ title, exports, imports }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-[#f4f6fb] p-5">
      {title && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((column) => (
          <RankingColumn
            key={column.title}
            title={column.title}
            products={column.flow === 'exports' ? exports : imports}
            metric={column.metric}
            color={column.color}
          />
        ))}
      </div>
    </div>
  )
}

function ModeToggle({ mode, onChange }) {
  const options = [
    { key: 'separate', label: 'Separar', icon: Rows3 },
    { key: 'merge', label: 'Mesclar', icon: Layers },
  ]
  const activeIndex = options.findIndex((option) => option.key === mode)

  return (
    <div className="relative grid grid-cols-2 rounded-full bg-[#e8e8e8] p-1">
      <span
        aria-hidden="true"
        className="absolute bottom-1 left-1 top-1 rounded-full bg-primary transition-transform duration-500 ease-in-out"
        style={{ width: 'calc((100% - 0.5rem) / 2)', transform: `translateX(${activeIndex * 100}%)` }}
      />
      {options.map((option) => {
        const Icon = option.icon
        const active = option.key === mode
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1 text-[12px] transition-colors duration-500 ${active ? 'font-medium text-white' : 'font-normal text-[#999999]'}`}
          >
            <Icon size={13} />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default function ProductRanking({ cities = DEFAULT_CITIES, period = 'todo o período' }) {
  const [mode, setMode] = useState('separate')
  const paisesLabel = cities.length ? cities.map((city) => city.name).join(', ') : 'Brasil'

  const hasMultiple = cities.length > 1
  const merged = hasMultiple && mode === 'merge'

  const mergedExports = mergeProducts(cities.flatMap((city) => city.exports))
  const mergedImports = mergeProducts(cities.flatMap((city) => city.imports))

  return (
    <div className="w-full bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Ranking Top 5 Produtos</h2>
          <p className="text-sm text-gray-500">
            Top 5 produtos de exportação e importação de {paisesLabel} × Piauí — {period}
          </p>
        </div>
        {hasMultiple && <ModeToggle mode={mode} onChange={setMode} />}
      </div>

      {merged ? (
        <RankingBlock exports={mergedExports} imports={mergedImports} />
      ) : (
        <div className="flex flex-col gap-6">
          {cities.map((city) => (
            <RankingBlock
              key={city.name}
              title={hasMultiple ? city.name : undefined}
              exports={city.exports}
              imports={city.imports}
            />
          ))}
        </div>
      )}
    </div>
  )
}
