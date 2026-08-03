import { useEffect, useId, useState } from 'react'
import { Funnel, X } from 'lucide-react'
import { ChipFiltro } from './BarraFiltrosAtivos'

/**
 * Moldura dos filtros das duas telas, em três formas:
 *
 * - celular (< md): bottom sheet subindo do rodapé, com alça e cantos arredondados
 * - tablet (md–lg): gaveta encostada na direita, ocupando a altura toda
 * - desktop (>= lg): a coluna fixa de 287px do design, sem cabeçalho nem rodapé
 *
 * O conteúdo é montado uma vez só; o que muda entre as formas são as classes,
 * então o estado dos campos nunca se perde na troca de breakpoint.
 *
 * "Aplicar filtros" apenas confirma e fecha: cada campo já filtra na hora, igual
 * ao desktop. O rodapé existe para dar o gesto de saída que o mobile espera.
 */
export default function PainelFiltros({ children, rotulo = 'Filtros', chips = [], onLimpar }) {
    const quantidadeAtiva = chips.length
    const [aberto, setAberto] = useState(false)
    const idPainel = useId()

    /*
     * A partir de `lg` o painel é a coluna fixa e "aberto" perde o sentido.
     * Sem zerar aqui, quem abrisse a folha no celular e alargasse a janela
     * ficava com a página travada: o painel some pelo `lg:`, mas o estado
     * seguia aberto e a trava de rolagem do body nunca era desfeita.
     */
    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 64rem)')
        const fecharNoDesktop = () => { if (desktop.matches) setAberto(false) }
        fecharNoDesktop()
        desktop.addEventListener('change', fecharNoDesktop)
        return () => desktop.removeEventListener('change', fecharNoDesktop)
    }, [])

    useEffect(() => {
        if (!aberto) return
        const aoTeclar = (evento) => { if (evento.key === 'Escape') setAberto(false) }
        document.addEventListener('keydown', aoTeclar)
        // Trava a rolagem do fundo enquanto a folha está por cima
        const rolagemOriginal = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', aoTeclar)
            document.body.style.overflow = rolagemOriginal
        }
    }, [aberto])

    return (
        <>
            <div className="flex items-center gap-3 lg:hidden">
                <button
                    type="button"
                    onClick={() => setAberto(true)}
                    aria-label={rotulo}
                    aria-expanded={aberto}
                    aria-controls={idPainel}
                    className="relative flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-marca-fundo text-texto-sobre-marca transition-colors hover:bg-marca-fundo/85"
                >
                    <Funnel size={20} />
                    {quantidadeAtiva > 0 && (
                        <span
                            aria-hidden="true"
                            className="absolute -left-1.5 -top-1.5 flex min-w-[20px] items-center justify-center rounded-full bg-marca-realce px-1 text-[11px] font-bold text-marca-realce-texto"
                        >
                            {quantidadeAtiva}
                        </span>
                    )}
                </button>
                <span className="text-[16px] font-medium text-texto-1">{rotulo}</span>
            </div>

            {/*
              * z acima de 1000 nos dois: é a faixa em que o Leaflet põe os controles
              * do mapa (voltar ao Piauí, rosa dos ventos, leitura de coordenadas), e
              * eles furavam a folha por cima. Como nenhum ancestral do mapa cria
              * contexto de empilhamento, aqueles z-[1000] disputam direto com estes.
              */}
            {aberto && (
                <div
                    onClick={() => setAberto(false)}
                    aria-hidden="true"
                    className="fixed inset-0 z-[1100] bg-black/40 lg:hidden"
                />
            )}

            <aside
                id={idPainel}
                role={aberto ? 'dialog' : undefined}
                aria-modal={aberto ? 'true' : undefined}
                aria-label={rotulo}
                className={`flex-col bg-superficie-1 ${aberto
                    ? 'fixed inset-x-0 bottom-0 z-[1110] flex max-h-[90vh] rounded-t-[20px] shadow-xl md:inset-y-0 md:bottom-auto md:left-auto md:right-0 md:h-full md:max-h-none md:w-[400px] md:max-w-[85vw] md:rounded-none'
                    : 'hidden'
                } lg:sticky lg:inset-auto lg:top-4 lg:z-auto lg:flex lg:h-fit lg:max-h-none lg:w-[287px] lg:shrink-0 lg:rounded-[10px] lg:border lg:border-borda lg:p-4 lg:shadow-none`}
            >
                {/* Alça do bottom sheet — some quando vira gaveta lateral */}
                <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-borda-forte md:hidden" />

                <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-4 lg:hidden">
                    <span className="text-[20px] font-semibold text-marca-texto">{rotulo}</span>
                    <button
                        type="button"
                        onClick={() => setAberto(false)}
                        aria-label={`Fechar ${rotulo.toLowerCase()}`}
                        className="flex size-8 items-center justify-center rounded-full bg-marca-suave text-marca-texto transition-colors hover:bg-marca-realce"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex min-h-0 w-full flex-1 flex-col gap-[18px] overflow-y-auto px-5 py-4 lg:overflow-visible lg:p-0">
                    {/* No desktop os chips ficam na barra "Filtros ativos", que aqui só mostra a contagem */}
                    {quantidadeAtiva > 0 && (
                        <div className="flex flex-col gap-2 lg:hidden">
                            <span className="text-[14px] font-medium text-texto-2">Filtros ativos</span>
                            <div className="flex flex-wrap gap-2">
                                {chips.map((chip) => <ChipFiltro key={chip.chave} chip={chip} />)}
                            </div>
                        </div>
                    )}

                    {children}
                </div>

                <div className="flex shrink-0 gap-3 border-t border-borda px-5 py-4 lg:hidden">
                    <button
                        type="button"
                        onClick={() => onLimpar?.()}
                        className="flex-1 rounded-[10px] border border-marca-texto px-4 py-3 text-[16px] font-medium text-marca-texto transition-colors hover:bg-marca-suave"
                    >
                        Limpar
                    </button>
                    <button
                        type="button"
                        onClick={() => setAberto(false)}
                        className="flex-1 rounded-[10px] bg-marca-fundo px-4 py-3 text-[16px] font-medium text-texto-sobre-marca transition-colors hover:bg-marca-fundo/85"
                    >
                        Aplicar filtros
                    </button>
                </div>
            </aside>
        </>
    )
}
