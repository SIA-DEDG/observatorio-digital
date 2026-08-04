import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

/*
 * Seção "Baixar Informações" das duas abas. Vive num componente só para as duas
 * não divergirem: o que muda entre elas é o que cada formato gera, não o visual.
 */
const FORMATOS = [
    { chave: 'json', rotulo: 'Baixar em JSON', estilo: 'border-borda bg-marca-fundo text-texto-sobre-marca hover:bg-marca-fundo/85' },
    { chave: 'xlsx', rotulo: 'Baixar em XLSX', estilo: 'border-borda bg-marca-realce text-marca-realce-texto hover:bg-marca-realce-hover' },
    { chave: 'csv', rotulo: 'Baixar em CSV', estilo: 'border-borda text-marca-texto hover:bg-marca-suave' },
]

export default function SecaoDownload({
    titulo = 'Baixar Informações',
    descricao = 'Baixe as informações acima nos formatos abaixo',
    geradores,
    desabilitado = false,
}) {
    const [baixando, setBaixando] = useState(null)

    const baixar = (chave) => async () => {
        setBaixando(chave)
        try {
            await geradores[chave]()
        } catch (erro) {
            console.error(`baixar ${chave}:`, erro)
            alert(`Falha ao gerar o ${chave.toUpperCase()}: ${erro.message}`)
        } finally {
            setBaixando(null)
        }
    }

    const bloqueado = desabilitado || baixando !== null

    return (
        <>
            <div className="flex flex-col gap-[6px]">
                <h3 className="text-[18px] font-medium text-marca-texto">{titulo}</h3>
                <p className="text-justify text-[16px] font-light text-texto-1">{descricao}</p>
            </div>

            <div className="flex flex-col gap-[13px] sm:flex-row">
                {FORMATOS.map((formato) => (
                    <button
                        key={formato.chave}
                        type="button"
                        disabled={bloqueado}
                        onClick={baixar(formato.chave)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] border p-[10px] text-[16px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${formato.estilo}`}
                    >
                        {baixando === formato.chave
                            ? <Loader2 size={16} className="animate-spin" />
                            : <Download size={16} />}
                        {formato.rotulo}
                    </button>
                ))}
            </div>
        </>
    )
}
