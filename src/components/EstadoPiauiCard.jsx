import { Loader2 } from 'lucide-react'
import { moedaCompacta, numeroCompacto, numero } from '../util/formats'

const Selo = ({ children }) => (
    <span className="flex min-h-[30px] min-w-0 items-center justify-center rounded-full bg-secondary-100/20 px-[10px] py-1 text-center text-[16px] leading-tight text-white">
        {children}
    </span>
)

export default function EstadoPiauiCard({ stats, titulo = 'Estado do Piauí', carregando = false }) {
    const valorFormatado = (chave, formatador) =>
        (stats?.[chave] != null ? formatador.format(stats[chave]) : 'XX')

    return (
        <div className="flex flex-col gap-[18px] rounded-[10px] bg-primary p-4">
            <h3 className="text-center text-[24px] font-semibold text-white">{titulo}</h3>
            {carregando ? (
                <div className="flex h-[102px] items-center justify-center gap-2 text-white/80">
                    <Loader2 size={22} className="animate-spin" />
                    <span className="text-[13px]">Carregando dados…</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Selo>{valorFormatado('produtos', numero)} Tipos de produtos</Selo>
                    <Selo>{valorFormatado('paises', numero)} Países</Selo>
                    <Selo>{valorFormatado('exportado', moedaCompacta)} Valor geral de exportação</Selo>
                    <Selo>{valorFormatado('qtdExportadaToneladas', numeroCompacto)} Quant. (t) geral exportada</Selo>
                    <Selo>{valorFormatado('importado', moedaCompacta)} Valor geral de importação</Selo>
                    <Selo>{valorFormatado('qtdImportadaToneladas', numeroCompacto)} Quant. (t) geral importada</Selo>
                </div>
            )}
        </div>
    )
}
