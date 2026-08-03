import { BanknoteArrowUp, BanknoteArrowDown, CircleDollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { moedaCompacta } from '../util/formats'

const percentual = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const EXPLICACAO_SALDO = 'Superávit: ocorre quando as vendas externas (exportações) superam as compras de fora (importações). '
    + 'Déficit: ocorre se as importações forem maiores que as exportações.'

// Abaixo de `lg` cabem dois cards por linha, então card, fonte e ícone encolhem
function CardIndicador({ icone: Icone, titulo, periodo, rotulo, valor, tendencia, total, rotuloTotal, largo = false }) {
    return (
        <div className={`flex min-w-0 flex-col gap-2 rounded-[14px] bg-marca-suave p-2 lg:gap-[10px] lg:rounded-[20px] lg:p-[10px] ${largo ? 'col-span-2 lg:col-span-1' : ''}`}>
            <div className="flex items-center justify-between gap-2 px-1 lg:gap-3 lg:px-2">
                <div className="flex min-w-0 items-center gap-1.5 lg:gap-[10px]">
                    <span className="flex size-[22px] shrink-0 items-center justify-center rounded-[5px] bg-chip-icone lg:size-[28px]">
                        <Icone className="size-[15px] text-white lg:size-[22px]" />
                    </span>
                    <span className="truncate text-[13px] text-texto-2 lg:text-[18px]">{titulo}</span>
                </div>
                <span className="shrink-0 text-[10px] text-texto-2 lg:text-[13px]">{periodo}</span>
            </div>

            <div className="flex flex-1 flex-col gap-1 rounded-[12px] bg-superficie-elevada p-2 lg:rounded-[18px] lg:p-[10px]">
                <span className="truncate text-[11px] font-medium text-texto-2 lg:text-[14px]" title={rotulo}>{rotulo}</span>
                <span className="text-[15px] font-bold text-texto-1 lg:text-[20px]">{valor}</span>
                {tendencia}
            </div>

            <div className="flex items-center gap-1.5 px-1 lg:gap-[10px] lg:px-2">
                <span className="text-[13px] font-bold text-texto-1 lg:text-[16px]">{total}</span>
                <span className="text-[11px] font-medium text-texto-2 lg:text-[14px]">{rotuloTotal}</span>
            </div>
        </div>
    )
}

function LinhaTendencia({ tendencia }) {
    const Icone = tendencia.superavit ? TrendingUp : TrendingDown
    const cor = tendencia.superavit ? 'text-estado-ok' : 'text-estado-erro'
    const sinal = tendencia.saldo > 0 ? '+' : ''

    return (
        <div className="flex items-center gap-1.5" title={EXPLICACAO_SALDO}>
            <Icone className={`size-3 shrink-0 lg:size-[14px] ${cor}`} />
            <p className="min-w-0 text-[10px] lg:text-[12px]">
                <span className={`font-medium ${cor}`}>
                    {sinal}{moedaCompacta.format(tendencia.saldo)} — {tendencia.superavit ? 'Superávit' : 'Déficit'}
                </span>
                <span className="text-grey-400">
                    {' '}({percentual.format(tendencia.percentual)}% do comércio do Piauí no período)
                </span>
            </p>
        </div>
    )
}

export default function CardsBalanca({ totais, tendencia, rotuloRecorte, periodo }) {
    return (
        // Exportação e Importação lado a lado; Saldo ocupa a linha inteira embaixo
        <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-3 lg:gap-5">
            <CardIndicador
                icone={BanknoteArrowUp}
                titulo="Exportação"
                periodo={periodo}
                rotulo={rotuloRecorte}
                valor={moedaCompacta.format(totais.exportadoRecorte)}
                total={moedaCompacta.format(totais.exportadoTotal)}
                rotuloTotal="Exportação Total"
            />
            <CardIndicador
                icone={BanknoteArrowDown}
                titulo="Importação"
                periodo={periodo}
                rotulo={rotuloRecorte}
                valor={moedaCompacta.format(totais.importadoRecorte)}
                total={moedaCompacta.format(totais.importadoTotal)}
                rotuloTotal="Importação Total"
            />
            <CardIndicador
                largo
                icone={CircleDollarSign}
                titulo="Saldo comercial"
                periodo={periodo}
                rotulo={rotuloRecorte}
                valor={moedaCompacta.format(totais.saldoRecorte)}
                tendencia={<LinhaTendencia tendencia={tendencia} />}
                total={moedaCompacta.format(totais.saldoTotal)}
                rotuloTotal="Saldo Total"
            />
        </div>
    )
}
