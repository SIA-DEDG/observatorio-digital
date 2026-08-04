import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown, Maximize2, X } from 'lucide-react'
import BarraRolagem from './BarraRolagem'
import BotoesDownload from './BotoesDownload'
import { formatos } from '../util/formats'

function SortIcon({ estado }) {
    if (estado === 'asc') return <ChevronUp size={13} className="text-marca-texto" />
    if (estado === 'desc') return <ChevronDown size={13} className="text-marca-texto" />
    return <ChevronsUpDown size={13} className="text-texto-3" />
}

// Números ficam à direita e tabulares para os dígitos alinharem; o resto segue
// o Figma, que centraliza as colunas de texto.
const ALINHAMENTOS = {
    left: { celula: 'text-left', conteudo: 'justify-start' },
    center: { celula: 'text-center', conteudo: 'justify-center' },
    right: { celula: 'text-right tabular-nums', conteudo: 'justify-end' },
}

// Sticky + border-collapse perde a borda: nas seções fixas as divisórias vêm de inset shadow
const DIVISORIA_FIXA = 'shadow-[inset_-1px_0_0_var(--borda)] last:shadow-none'

/*
 * Em tela cheia a primeira coluna gruda na esquerda. Sem isso a rolagem
 * horizontal é cega: a 375px a tabela tem 1191px e nenhuma coluna cabe inteira,
 * então ao arrastar para ver o valor você perde de vista de qual produto ele é.
 * z acima do thead (z-10) no cruzamento das duas fixações, senão o canto some.
 *
 * O max-w não é estético: `sticky` não segura elemento mais largo que o
 * scrollport — ele acompanha a rolagem em vez de ancorar. A 375px a coluna de
 * produto passava dos 349px visíveis e escorregava 8px. Presa a largura, o nome
 * quebra em linhas e a âncora se mantém.
 */
const COLUNA_FIXA = 'sticky left-0 max-w-[45vw] whitespace-normal bg-superficie-1'

export default function DataTable({
    colunas,
    linhas,
    titulo,
    retratil = false,
    abertoInicial = true,
    altura = 'max-h-[420px]',
    vazio = 'Nenhum registro encontrado',
    cabecalhoExtra = null,
    comDownload = false,
}) {
    const [ordem, setOrdem] = useState(null)
    const [aberto, setAberto] = useState(abertoInicial)
    const [expandido, setExpandido] = useState(false)
    const idConteudo = useId()
    const refConteudo = useRef(null)

    /*
     * Abaixo de lg a tabela não cabe: a 375px são 307px de área visível para
     * 1191px de tabela — nenhuma das 7 colunas aparece inteira. Expandir tira a
     * tabela do fluxo e entrega a viewport toda a ela.
     */
    useEffect(() => {
        if (!expandido) return
        const aoTeclar = (evento) => { if (evento.key === 'Escape') setExpandido(false) }
        document.addEventListener('keydown', aoTeclar)
        // Trava a rolagem do fundo enquanto a tabela cobre a tela
        const rolagemOriginal = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', aoTeclar)
            document.body.style.overflow = rolagemOriginal
        }
    }, [expandido])

    // A partir de lg a tabela já cabe na página e o botão some; sem isso quem
    // expandisse no tablet e alargasse a janela ficaria preso na tela cheia
    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 64rem)')
        const fecharNoDesktop = () => { if (desktop.matches) setExpandido(false) }
        fecharNoDesktop()
        desktop.addEventListener('change', fecharNoDesktop)
        return () => desktop.removeEventListener('change', fecharNoDesktop)
    }, [])

    const alinhamentoDe = (coluna, indice) => coluna.alinhamento ?? (indice === 0 ? 'left' : 'right')

    const linhasOrdenadas = useMemo(() => {
        if (!ordem) return linhas
        const { chave, direcao } = ordem
        const sinal = direcao === 'asc' ? 1 : -1

        return [...linhas].sort((primeiraLinha, segundaLinha) => {
            const primeiroValor = primeiraLinha[chave]
            const segundoValor = segundaLinha[chave]

            if (primeiroValor == null) return 1
            if (segundoValor == null) return -1
            if (typeof primeiroValor === 'number' && typeof segundoValor === 'number') {
                return (primeiroValor - segundoValor) * sinal
            }
            return String(primeiroValor).localeCompare(String(segundoValor), 'pt-BR') * sinal
        })
    }, [linhas, ordem])

    const totais = useMemo(() => {
        const colunasComTotal = colunas.filter((coluna) => coluna.total)
        if (colunasComTotal.length === 0) return null
        return Object.fromEntries(
            colunasComTotal.map((coluna) => [
                coluna.chave,
                linhas.reduce((soma, linha) => soma + (Number(linha[coluna.chave]) || 0), 0),
            ]),
        )
    }, [colunas, linhas])

    const alternarOrdem = (chave) =>
        setOrdem((atual) => {
            if (atual?.chave !== chave) return { chave, direcao: 'desc' }
            if (atual.direcao === 'desc') return { chave, direcao: 'asc' }
            return null
        })

    // Expandido, o retrátil não faz sentido: a tela inteira é da tabela
    const conteudoVisivel = expandido || !retratil || aberto

    /*
     * Uma árvore só; o que muda entre a forma embutida e a tela cheia são as
     * classes. Assim ordenação e posição de rolagem sobrevivem à troca — mesmo
     * arranjo que o PainelFiltros usa para os três breakpoints dele.
     *
     * z acima de 1110 porque é onde o painel de filtros põe a folha dele, que
     * por sua vez já sobe acima dos controles do Leaflet em z-[1000].
     */
    return (
        <div
            role={expandido ? 'dialog' : undefined}
            aria-modal={expandido ? 'true' : undefined}
            aria-label={expandido ? titulo : undefined}
            className={expandido
                ? 'fixed inset-0 z-[1200] flex flex-col gap-2 bg-fundo p-3'
                : 'flex w-full flex-col gap-[17px]'}
        >
            <div className={`flex w-full flex-col overflow-hidden rounded-[5px] border border-borda bg-superficie-1 ${expandido ? 'min-h-0 flex-1' : ''}`}>
                {titulo && (
                    <Cabecalho
                        titulo={titulo}
                        retratil={retratil && !expandido}
                        aberto={aberto}
                        idConteudo={idConteudo}
                        onAlternar={() => setAberto((atual) => !atual)}
                        expandido={expandido}
                        onExpandir={() => setExpandido(true)}
                        onFechar={() => setExpandido(false)}
                    />
                )}

                {conteudoVisivel && cabecalhoExtra}

                {conteudoVisivel && (
                    <div id={idConteudo} ref={refConteudo} className={`rolagem-oculta overflow-auto ${expandido ? 'min-h-0 flex-1' : altura}`}>
                        <table className={`w-full border-collapse ${expandido ? 'text-[12px]' : 'text-[14px]'}`}>
                            <thead className="sticky top-0 z-10 bg-superficie-1 text-texto-1 shadow-[inset_0_1px_0_var(--borda),inset_0_-1px_0_var(--borda)]">
                                <tr>
                                    {colunas.map((coluna, indice) => {
                                        const alinhamento = ALINHAMENTOS[alinhamentoDe(coluna, indice)]
                                        const estado = ordem?.chave === coluna.chave ? ordem.direcao : null
                                        return (
                                            <th
                                                key={coluna.chave}
                                                scope="col"
                                                aria-sort={estado ? (estado === 'asc' ? 'ascending' : 'descending') : 'none'}
                                                className={`px-3 py-2 font-light uppercase ${DIVISORIA_FIXA} ${alinhamento.celula} ${expandido && indice === 0 ? `${COLUNA_FIXA} z-20` : 'whitespace-nowrap'}`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => alternarOrdem(coluna.chave)}
                                                    className={`flex w-full items-center gap-1 transition-colors hover:text-primary ${alinhamento.conteudo}`}
                                                >
                                                    {coluna.label}
                                                    <SortIcon estado={estado} />
                                                </button>
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>

                            <tbody>
                                {linhasOrdenadas.length === 0 && (
                                    <tr>
                                        <td colSpan={colunas.length} className="px-3 py-8 text-center text-texto-3">
                                            {vazio}
                                        </td>
                                    </tr>
                                )}

                                {linhasOrdenadas.map((linha, indiceLinha) => (
                                    <tr
                                        key={linha.id ?? indiceLinha}
                                        className="group border-b border-borda bg-superficie-1 transition-colors hover:bg-marca-suave"
                                    >
                                        {colunas.map((coluna, indice) => {
                                            const formatar = coluna.formato ?? formatos.texto
                                            return (
                                                <td
                                                    key={coluna.chave}
                                                    className={`border-r border-borda px-3 py-2 text-texto-1 last:border-r-0 ${ALINHAMENTOS[alinhamentoDe(coluna, indice)].celula} ${expandido && indice === 0 ? `${COLUNA_FIXA} z-[1] group-hover:bg-marca-suave` : 'whitespace-nowrap'}`}
                                                >
                                                    {formatar(linha[coluna.chave], linha)}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>

                            {/* z na seção, como no thead: sem isso a coluna fixa das linhas
                                passava por cima do "Total" ao rolar para a direita */}
                            {totais && linhasOrdenadas.length > 0 && (
                                <tfoot className="sticky bottom-0 z-20 bg-superficie-1 shadow-[inset_0_1px_0_var(--borda)]">
                                    <tr className="font-medium text-texto-1">
                                        {colunas.map((coluna, indice) => {
                                            const formatar = coluna.formato ?? formatos.texto
                                            return (
                                                <td
                                                    key={coluna.chave}
                                                    className={`px-3 py-2 ${DIVISORIA_FIXA} ${ALINHAMENTOS[alinhamentoDe(coluna, indice)].celula} ${expandido && indice === 0 ? `${COLUNA_FIXA} z-20` : 'whitespace-nowrap'}`}
                                                >
                                                    {indice === 0 ? 'Total' : coluna.total ? formatar(totais[coluna.chave]) : ''}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>

            {/* A barra fica fora do card, como no Figma; a nativa some pelo rolagem-oculta */}
            {conteudoVisivel && <BarraRolagem alvoRef={refConteudo} />}

            {/* Só em tela cheia: na página a aba já tem a própria seção de download */}
            {expandido && comDownload && (
                <BotoesDownload colunas={colunas} linhas={linhasOrdenadas} totais={totais} titulo={titulo} />
            )}
        </div>
    )
}

/*
 * O recolher e o expandir são dois controles irmãos, nunca aninhados: o título
 * inteiro já era o botão de recolher, e pôr o expandir dentro dele geraria
 * botão dentro de botão — HTML inválido e clique ambíguo.
 */
function Cabecalho({ titulo, retratil, aberto, idConteudo, onAlternar, expandido, onExpandir, onFechar }) {
    const IconeAcao = expandido ? X : Maximize2
    const tamanhoTitulo = expandido ? 'text-[14px]' : 'text-[16px]'

    return (
        <div className="flex h-[37px] items-center gap-1 bg-marca-realce px-[10px]">
            {retratil
                ? (
                    <button
                        type="button"
                        onClick={onAlternar}
                        aria-expanded={aberto}
                        aria-controls={idConteudo}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 self-stretch text-left transition-opacity hover:opacity-80"
                    >
                        <h3 className={`truncate ${tamanhoTitulo} text-marca-realce-texto`}>{titulo}</h3>
                        <ChevronUp
                            size={18}
                            className={`shrink-0 text-marca-realce-texto transition-transform duration-200 ${aberto ? '' : 'rotate-180'}`}
                        />
                    </button>
                )
                : <h3 className={`min-w-0 flex-1 truncate ${tamanhoTitulo} text-marca-realce-texto`}>{titulo}</h3>}

            <button
                type="button"
                onClick={expandido ? onFechar : onExpandir}
                aria-label={expandido ? `Fechar ${titulo} em tela cheia` : `Expandir ${titulo} em tela cheia`}
                title={expandido ? 'Fechar (Esc)' : 'Expandir'}
                // Só abaixo de lg: no desktop a tabela já cabe na página
                className={`flex size-7 shrink-0 items-center justify-center rounded text-marca-realce-texto transition-colors hover:bg-marca-realce-hover ${expandido ? '' : 'lg:hidden'}`}
            >
                <IconeAcao size={16} />
            </button>
        </div>
    )
}
