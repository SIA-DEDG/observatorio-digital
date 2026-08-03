import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip } from 'chart.js'
import { moedaCompacta } from '../util/formats'
import { usePaleta } from '../tema/paletas'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

const serie = (rotulo, dados, cor, contornoPonto) => ({
    label: rotulo,
    data: dados,
    borderColor: cor,
    backgroundColor: cor,
    pointBackgroundColor: cor,
    pointBorderColor: contornoPonto,
    pointBorderWidth: 2,
    pointRadius: 5,
    pointHoverRadius: 8,
    borderWidth: 2,
})

// Chart.js pinta por objeto de opções, não por CSS: precisa ser refeito a cada tema
const montarOpcoes = (paleta) => ({
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
            grid: { color: paleta.grade, drawTicks: false },
            ticks: { color: paleta.ticks, padding: 8, callback: (valor) => moedaCompacta.format(valor) },
            border: { display: false },
        },
        x: {
            grid: { display: false },
            ticks: { color: paleta.ticks, padding: 6 },
            border: { color: paleta.bordaEixo },
        },
    },
})

function ItemLegenda({ cor, rotulo }) {
    return (
        <div className="flex items-center gap-2">
            <span className="size-[10px] shrink-0 rounded-full" style={{ backgroundColor: cor }} />
            <span className="text-[16px] text-texto-1">{rotulo}</span>
        </div>
    )
}

export default function SaldoComercialChart({ balanca, rotuloRecorte, periodo }) {
    const { grafico } = usePaleta()
    const opcoes = useMemo(() => montarOpcoes(grafico), [grafico])

    // Duas séries sempre: a base total do Piauí e o recorte de Economia Digital
    const datasets = [
        serie('Saldo Tradicional', balanca.saldoTradicional, grafico.saldoTradicional, grafico.contornoPonto),
        serie(`Saldo (${rotuloRecorte})`, balanca.saldoRecorte, grafico.saldoRecorte, grafico.contornoPonto),
    ]
    const participacao = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
        .format(balanca.participacao.movimentacao)

    return (
        <section className="flex w-full flex-col gap-3">
            <div className="flex flex-col gap-1">
                <h2 className="text-[20px] font-bold text-texto-1">
                    Saldo comercial: Total vs. {rotuloRecorte}, por ano
                </h2>
                <p className="text-[16px] text-texto-1">
                    Saldo total do Piauí comparado ao de {rotuloRecorte} — {periodo}.
                    {' '}O recorte responde por {participacao}% do comércio do estado.
                </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-[17px]">
                <ItemLegenda cor={grafico.saldoTradicional} rotulo="Saldo Tradicional" />
                <ItemLegenda cor={grafico.saldoRecorte} rotulo={`Saldo (${rotuloRecorte})`} />
            </div>

            <div className="relative h-[320px] w-full">
                <Line data={{ labels: balanca.labels, datasets }} options={opcoes} />
            </div>
        </section>
    )
}
