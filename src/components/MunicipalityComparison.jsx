import { Bar } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
} from 'chart.js'
import { moedaCompacta } from '../util/formats'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const EXPORT_COLOR = '#0E50A6'
const IMPORT_COLOR = '#f59e0b'

export default function MunicipalityComparison({ rows = [], period = 'todo o período' }) {
    const data = {
        labels: rows.map((row) => row.nome),
        datasets: [
            {
                label: 'Valor de Exportação',
                data: rows.map((row) => row.exportado),
                backgroundColor: EXPORT_COLOR,
                borderRadius: 4,
            },
            {
                label: 'Valor de Importação',
                data: rows.map((row) => row.importado),
                backgroundColor: IMPORT_COLOR,
                borderRadius: 4,
            },
        ],
    }

    const options = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx) => `${ctx.dataset.label}: ${moedaCompacta.format(ctx.parsed.x)}`,
                },
            },
        },
        scales: {
            x: {
                grid: { color: '#e5e7eb' },
                ticks: { color: '#6b7280', callback: (value) => moedaCompacta.format(value) },
                border: { display: false },
            },
            y: {
                grid: { display: false },
                ticks: { color: '#6b7280' },
                border: { display: false },
            },
        },
    }

    const height = Math.max(220, rows.length * 60)

    return (
        <div className="w-full bg-white p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-base font-semibold text-gray-800">Comparação de municípios</h2>
                    <p className="text-sm text-gray-500">
                        Comparação entre os municípios por valor de exportação e importação — {period}
                    </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: EXPORT_COLOR }} />
                        <span className="text-sm text-gray-600">Valor de Exportação</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: IMPORT_COLOR }} />
                        <span className="text-sm text-gray-600">Valor de Importação</span>
                    </div>
                </div>
            </div>

            {rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">Nenhum município no recorte atual</p>
            ) : (
                <div className="relative w-full" style={{ height }}>
                    <Bar data={data} options={options} />
                </div>
            )}
        </div>
    )
}
