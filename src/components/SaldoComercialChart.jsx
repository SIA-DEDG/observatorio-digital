import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip } from 'chart.js'
import { moedaCompacta } from '../util/formats'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

// Legenda "Saldo Tradicional" / "Saldo (setor ou produto)" do design
const COR_TRADICIONAL = '#1661C3'
const COR_RECORTE = '#E5940A'

const serie = (rotulo, dados, cor) => ({
    label: rotulo,
    data: dados,
    borderColor: cor,
    backgroundColor: cor,
    pointBackgroundColor: cor,
    pointBorderColor: '#ffffff',
    pointBorderWidth: 2,
    pointRadius: 5,
    pointHoverRadius: 8,
    borderWidth: 2,
})

const opcoes = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
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
            grid: { color: '#e5e7eb', drawTicks: false },
            ticks: { color: '#6b7280', padding: 8, callback: (valor) => moedaCompacta.format(valor) },
            border: { display: false },
        },
        x: {
            grid: { display: false },
            ticks: { color: '#6b7280', padding: 6 },
            border: { color: '#8e8e93' },
        },
    },
}

function ItemLegenda({ cor, rotulo }) {
    return (
        <div className="flex items-center gap-2">
            <span className="size-[10px] shrink-0 rounded-full" style={{ backgroundColor: cor }} />
            <span className="text-[16px] text-black">{rotulo}</span>
        </div>
    )
}

export default function SaldoComercialChart({ balanca, rotuloRecorte, periodo }) {
    // Duas séries sempre: a base total do Piauí e o recorte de Economia Digital
    const datasets = [
        serie('Saldo Tradicional', balanca.saldoTradicional, COR_TRADICIONAL),
        serie(`Saldo (${rotuloRecorte})`, balanca.saldoRecorte, COR_RECORTE),
    ]
    const participacao = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
        .format(balanca.participacao.movimentacao)

    return (
        <section className="flex w-full flex-col gap-3">
            <div className="flex flex-col gap-1">
                <h2 className="text-[20px] font-bold text-black">
                    Saldo comercial: Total vs. ({rotuloRecorte}), por ano
                </h2>
                <p className="text-[16px] text-black">
                    Saldo total do Piauí comparado ao de {rotuloRecorte} — {periodo}.
                    {' '}O recorte responde por {participacao}% do comércio do estado.
                </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-[17px]">
                <ItemLegenda cor={COR_TRADICIONAL} rotulo="Saldo Tradicional" />
                <ItemLegenda cor={COR_RECORTE} rotulo={`Saldo (${rotuloRecorte})`} />
            </div>

            <div className="relative h-[320px] w-full">
                <Line data={{ labels: balanca.labels, datasets }} options={opcoes} />
            </div>
        </section>
    )
}
