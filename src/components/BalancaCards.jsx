import { Scale, PackageSearch, TrendingDown, TrendingUp } from 'lucide-react'
import { moedaCompacta } from '../util/formats'

const percentual = (parte, total) => (total > 0 ? `${((parte / total) * 100).toFixed(1)}%` : '—')

function CardSaldo({ icone: Icone, valor, rotulo, detalhe }) {
    return (
        <div className="flex h-[89px] min-w-[224px] flex-1 items-center gap-4 rounded-[10px] border border-[#cbcbcb] bg-white px-4 py-2 shadow-[2px_2px_2px_rgba(0,0,0,0.15)]">
            <div className="flex size-[48px] shrink-0 items-center justify-center rounded-full bg-primary-100">
                <Icone size={24} className="text-primary" />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[22px] font-medium text-[#232323]">{valor}</span>
                <span className="text-[13px] text-[#464646]">{rotulo}</span>
                <span className="truncate text-[12px] font-light text-[#464646]">{detalhe}</span>
            </div>
        </div>
    )
}

export default function BalancaCards({ totais, temFiltro, periodo }) {
    const valorFiltrado = (chave) => (temFiltro ? moedaCompacta.format(totais[chave]) : '—')
    const dica = 'Selecione um setor ou produto'

    return (
        <div className="flex flex-wrap items-stretch gap-4">
            <CardSaldo
                icone={Scale}
                valor={moedaCompacta.format(totais.saldoTradicional)}
                rotulo="Saldo Tradicional"
                detalhe={periodo}
            />
            <CardSaldo
                icone={PackageSearch}
                valor={valorFiltrado('saldoFiltrado')}
                rotulo="Saldo (setor ou produto)"
                detalhe={temFiltro ? periodo : dica}
            />
            <CardSaldo
                icone={TrendingDown}
                valor={valorFiltrado('importadoFiltrado')}
                rotulo="Importação (setor ou produto)"
                detalhe={temFiltro ? `${percentual(totais.importadoFiltrado, totais.importadoTotal)} da importação total` : dica}
            />
            <CardSaldo
                icone={TrendingUp}
                valor={valorFiltrado('exportadoFiltrado')}
                rotulo="Exportação (setor ou produto)"
                detalhe={temFiltro ? `${percentual(totais.exportadoFiltrado, totais.exportadoTotal)} da exportação total` : dica}
            />
        </div>
    )
}
