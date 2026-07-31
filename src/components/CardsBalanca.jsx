import { BanknoteArrowUp, BanknoteArrowDown, CircleDollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { moedaCompacta } from '../util/formats'

const percentual = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const EXPLICACAO_SALDO = 'Superávit: ocorre quando as vendas externas (exportações) superam as compras de fora (importações). '
    + 'Déficit: ocorre se as importações forem maiores que as exportações.'

function CardIndicador({ icone: Icone, titulo, periodo, rotulo, valor, tendencia, total, rotuloTotal }) {
    return (
        <div className="flex min-w-[300px] flex-1 flex-col gap-[10px] rounded-[20px] bg-secondary-100 p-[10px]">
            <div className="flex items-center justify-between gap-3 px-2">
                <div className="flex min-w-0 items-center gap-[10px]">
                    <span className="flex size-[28px] shrink-0 items-center justify-center rounded-[5px] bg-[#092552]">
                        <Icone size={22} className="text-white" />
                    </span>
                    <span className="truncate text-[18px] text-[#475467]">{titulo}</span>
                </div>
                <span className="shrink-0 text-[13px] text-grey-500">{periodo}</span>
            </div>

            <div className="flex flex-1 flex-col gap-1 rounded-[18px] bg-white p-[10px]">
                <span className="truncate text-[14px] font-medium text-grey-500" title={rotulo}>{rotulo}</span>
                <span className="text-[20px] font-bold text-[#101828]">{valor}</span>
                {tendencia}
            </div>

            <div className="flex items-center gap-[10px] px-2">
                <span className="text-[16px] font-bold text-black">{total}</span>
                <span className="text-[14px] font-medium text-grey-500">{rotuloTotal}</span>
            </div>
        </div>
    )
}

function LinhaTendencia({ tendencia }) {
    const Icone = tendencia.superavit ? TrendingUp : TrendingDown
    const cor = tendencia.superavit ? 'text-[#2aa745]' : 'text-danger'
    const sinal = tendencia.saldo > 0 ? '+' : ''

    return (
        <div className="flex items-center gap-1.5" title={EXPLICACAO_SALDO}>
            <Icone size={14} className={`shrink-0 ${cor}`} />
            <p className="min-w-0 text-[12px]">
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
        <div className="flex flex-wrap items-stretch gap-5">
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
