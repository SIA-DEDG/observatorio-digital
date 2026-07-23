import { Package, Globe, TrendingUp, TrendingDown, ArrowUpFromLine, ArrowDownToLine, Loader2 } from 'lucide-react'
import { moedaCompacta, numeroCompacto, numero } from '../util/formats'

const Pill = ({ icone: Icone, children }) => (
    <span className="flex h-[30px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[rgba(227,232,254,0.2)] px-[10px] text-[14px] text-white">
        {Icone && <Icone size={14} className="shrink-0" />}
        {children}
    </span>
)

export default function EstadoPiauiCard({ stats, titulo = 'Estado do Piauí', carregando = false }) {
    const valorFormatado = (chave, formatador) =>
        stats?.[chave] != null ? formatador.format(stats[chave]) : 'XX'

    return (
        <div className="flex flex-col gap-3 rounded-[10px] bg-primary p-4">
            <h3 className="text-[20px] font-semibold text-white">{titulo}</h3>
            {carregando ? (
                <div className="flex h-[76px] items-center justify-center gap-2 text-white/80">
                    <Loader2 size={22} className="animate-spin" />
                    <span className="text-[13px]">Carregando dados…</span>
                </div>
            ) : (
            <div className="flex flex-wrap gap-2">
                <Pill icone={Package}>{valorFormatado('produtos', numero)} Tipos de produtos</Pill>
                <Pill icone={Globe}>{valorFormatado('paises', numero)} Países</Pill>
                <Pill icone={TrendingUp}>{valorFormatado('exportado', moedaCompacta)} Valor geral de exportação</Pill>
                <Pill icone={ArrowUpFromLine}>{valorFormatado('qtdExportadaToneladas', numeroCompacto)} t exportadas</Pill>
                <Pill icone={TrendingDown}>{valorFormatado('importado', moedaCompacta)} Valor geral de importação</Pill>
                <Pill icone={ArrowDownToLine}>{valorFormatado('qtdImportadaToneladas', numeroCompacto)} t importadas</Pill>
            </div>
            )}
        </div>
    )
}
