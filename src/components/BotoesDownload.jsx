import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { exportarTabelaCSV, exportarTabelaJSON, exportarTabelaXLSX } from '../util/exportarTabela'

const FORMATOS = [
    { chave: 'csv', rotulo: 'CSV', exportar: exportarTabelaCSV },
    { chave: 'xlsx', rotulo: 'Planilha', exportar: exportarTabelaXLSX },
    { chave: 'json', rotulo: 'JSON', exportar: exportarTabelaJSON },
]

/**
 * Barra compacta de download da tabela expandida. Exporta exatamente o que está
 * na tela — e, como as linhas já chegam filtradas, o arquivo herda o recorte da
 * página sem precisar saber quais filtros estão ativos.
 */
export default function BotoesDownload({ colunas, linhas, totais, titulo }) {
    const [baixando, setBaixando] = useState(null)

    const baixar = (formato) => async () => {
        setBaixando(formato.chave)
        try {
            await formato.exportar(colunas, linhas, { titulo, totais })
        } catch (erro) {
            console.error(`exportar ${formato.chave}:`, erro)
            alert(`Falha ao gerar o ${formato.rotulo}: ${erro.message}`)
        } finally {
            setBaixando(null)
        }
    }

    const vazia = linhas.length === 0

    return (
        <div className="flex shrink-0 gap-2">
            {FORMATOS.map((formato) => (
                <button
                    key={formato.chave}
                    type="button"
                    disabled={vazia || baixando !== null}
                    onClick={baixar(formato)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-borda bg-superficie-1 px-2 py-2 text-[13px] font-medium text-marca-texto transition-colors hover:bg-marca-suave disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {baixando === formato.chave
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Download size={14} />}
                    {formato.rotulo}
                </button>
            ))}
        </div>
    )
}
