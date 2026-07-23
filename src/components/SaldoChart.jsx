import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip } from 'chart.js'
import { moedaCompacta } from '../util/formats'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

const COR_EXPORTACAO = '#2563eb'
const COR_IMPORTACAO = '#f59e0b'
const COR_SALDO = '#16a34a'
const COR_SALDO_TRADICIONAL = '#9ca3af'

const serie = (rotulo, dados, cor, tracejada = false) => ({
    label: rotulo,
    data: dados,
    borderColor: cor,
    backgroundColor: cor,
    pointRadius: 4,
    pointHoverRadius: 6,
    borderWidth: 2,
    borderDash: tracejada ? [6, 4] : undefined,
})

const opcoes = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (contexto) => `${contexto.dataset.label}: ${moedaCompacta.format(contexto.parsed.y)}`,
            },
        },
    },
    scales: {
        y: {
            grid: { color: '#e5e7eb' },
            ticks: { color: '#6b7280', callback: (valor) => moedaCompacta.format(valor) },
            border: { display: false },
        },
        x: {
            grid: { display: false },
            ticks: { color: '#6b7280' },
            border: { display: false },
        },
    },
}

function ItemLegenda({ cor, rotulo, tracejada = false }) {
    return (
        <div className="flex items-center gap-1.5">
            <span
                className="h-2.5 w-2.5 rounded-full"
                style={tracejada ? { border: `2px dashed ${cor}` } : { backgroundColor: cor }}
            />
            <span className="text-sm text-gray-600">{rotulo}</span>
        </div>
    )
}

export default function SaldoChart({ balanca, temFiltro, periodo }) {
    const dados = {
        labels: balanca.labels,
        datasets: temFiltro
            ? [
                serie('Saldo total do Piauí', balanca.saldoTradicional, COR_SALDO_TRADICIONAL, true),
                serie('Saldo da seleção', balanca.saldoFiltrado, COR_SALDO),
            ]
            : [
                serie('Exportação', balanca.exportacaoTradicional, COR_EXPORTACAO),
                serie('Importação', balanca.importacaoTradicional, COR_IMPORTACAO),
                serie('Saldo', balanca.saldoTradicional, COR_SALDO),
            ],
    }

    return (
        <div className="w-full bg-white p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-gray-800">
                        {temFiltro
                            ? 'Balança comercial: saldo total do Piauí × saldo da seleção'
                            : 'Balança comercial: exportação, importação e saldo por ano'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {temFiltro
                            ? `Comparação com o setor/grupo/produto selecionado — ${periodo}`
                            : `Total do escopo atual — ${periodo}`}
                    </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-4">
                    {temFiltro
                        ? (
                            <>
                                <ItemLegenda cor={COR_SALDO_TRADICIONAL} rotulo="Saldo total do Piauí" tracejada />
                                <ItemLegenda cor={COR_SALDO} rotulo="Saldo da seleção" />
                            </>
                        )
                        : (
                            <>
                                <ItemLegenda cor={COR_EXPORTACAO} rotulo="Exportação" />
                                <ItemLegenda cor={COR_IMPORTACAO} rotulo="Importação" />
                                <ItemLegenda cor={COR_SALDO} rotulo="Saldo" />
                            </>
                        )}
                </div>
            </div>
            <div className="relative h-[320px] w-full">
                <Line data={dados} options={opcoes} />
            </div>
        </div>
    )
}
