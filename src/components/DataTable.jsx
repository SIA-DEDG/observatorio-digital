import { useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import BarraRolagem from './BarraRolagem'
import { formatos } from '../util/formats'

function SortIcon({ estado }) {
    if (estado === 'asc') return <ChevronUp size={13} className="text-primary" />
    if (estado === 'desc') return <ChevronDown size={13} className="text-primary" />
    return <ChevronsUpDown size={13} className="text-grey-400" />
}

// Números ficam à direita e tabulares para os dígitos alinharem; o resto segue
// o Figma, que centraliza as colunas de texto.
const ALINHAMENTOS = {
    left: { celula: 'text-left', conteudo: 'justify-start' },
    center: { celula: 'text-center', conteudo: 'justify-center' },
    right: { celula: 'text-right tabular-nums', conteudo: 'justify-end' },
}

// Sticky + border-collapse perde a borda: nas seções fixas as divisórias vêm de inset shadow
const DIVISORIA_FIXA = 'shadow-[inset_-1px_0_0_#d9d9d9] last:shadow-none'

export default function DataTable({
    colunas,
    linhas,
    titulo,
    retratil = false,
    abertoInicial = true,
    altura = 'max-h-[420px]',
    vazio = 'Nenhum registro encontrado',
    cabecalhoExtra = null,
}) {
    const [ordem, setOrdem] = useState(null)
    const [aberto, setAberto] = useState(abertoInicial)
    const idConteudo = useId()
    const refConteudo = useRef(null)

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

    const conteudoVisivel = !retratil || aberto

    return (
        <div className="flex w-full flex-col gap-[17px]">
            <div className="flex w-full flex-col overflow-hidden rounded-[5px] border border-[#d9d9d9] bg-white">
                {titulo && (
                    <Cabecalho
                        titulo={titulo}
                        retratil={retratil}
                        aberto={aberto}
                        idConteudo={idConteudo}
                        onAlternar={() => setAberto((atual) => !atual)}
                    />
                )}

                {conteudoVisivel && cabecalhoExtra}

                {conteudoVisivel && (
                    <div id={idConteudo} ref={refConteudo} className={`rolagem-oculta overflow-auto ${altura}`}>
                        <table className="w-full border-collapse text-[14px]">
                            <thead className="sticky top-0 z-10 bg-white text-black shadow-[inset_0_1px_0_#d9d9d9,inset_0_-1px_0_#d9d9d9]">
                                <tr>
                                    {colunas.map((coluna, indice) => {
                                        const alinhamento = ALINHAMENTOS[alinhamentoDe(coluna, indice)]
                                        const estado = ordem?.chave === coluna.chave ? ordem.direcao : null
                                        return (
                                            <th
                                                key={coluna.chave}
                                                scope="col"
                                                aria-sort={estado ? (estado === 'asc' ? 'ascending' : 'descending') : 'none'}
                                                className={`whitespace-nowrap px-3 py-2 font-light uppercase ${DIVISORIA_FIXA} ${alinhamento.celula}`}
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
                                        <td colSpan={colunas.length} className="px-3 py-8 text-center text-grey-400">
                                            {vazio}
                                        </td>
                                    </tr>
                                )}

                                {linhasOrdenadas.map((linha, indiceLinha) => (
                                    <tr
                                        key={linha.id ?? indiceLinha}
                                        className="border-b border-[#d9d9d9] bg-white transition-colors hover:bg-secondary-100"
                                    >
                                        {colunas.map((coluna, indice) => {
                                            const formatar = coluna.formato ?? formatos.texto
                                            return (
                                                <td
                                                    key={coluna.chave}
                                                    className={`whitespace-nowrap border-r border-[#d9d9d9] px-3 py-2 text-black last:border-r-0 ${ALINHAMENTOS[alinhamentoDe(coluna, indice)].celula}`}
                                                >
                                                    {formatar(linha[coluna.chave], linha)}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>

                            {totais && linhasOrdenadas.length > 0 && (
                                <tfoot className="sticky bottom-0 bg-white shadow-[inset_0_1px_0_#d9d9d9]">
                                    <tr className="font-medium text-black">
                                        {colunas.map((coluna, indice) => {
                                            const formatar = coluna.formato ?? formatos.texto
                                            return (
                                                <td
                                                    key={coluna.chave}
                                                    className={`whitespace-nowrap px-3 py-2 ${DIVISORIA_FIXA} ${ALINHAMENTOS[alinhamentoDe(coluna, indice)].celula}`}
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
        </div>
    )
}

function Cabecalho({ titulo, retratil, aberto, idConteudo, onAlternar }) {
    const conteudo = (
        <>
            <h3 className="truncate text-[16px] text-black">{titulo}</h3>
            {retratil && (
                <ChevronUp
                    size={18}
                    className={`shrink-0 text-black transition-transform duration-200 ${aberto ? '' : 'rotate-180'}`}
                />
            )}
        </>
    )

    if (!retratil) {
        return <div className="flex h-[37px] items-center bg-[#9ec8ff] px-[10px]">{conteudo}</div>
    }

    return (
        <button
            type="button"
            onClick={onAlternar}
            aria-expanded={aberto}
            aria-controls={idConteudo}
            className="flex h-[37px] w-full items-center justify-between gap-2 bg-[#9ec8ff] px-[10px] text-left transition-colors hover:bg-[#8bbcf7]"
        >
            {conteudo}
        </button>
    )
}
