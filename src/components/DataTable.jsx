import { useId, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { formatos, numero } from '../util/formats'

function SortIcon({ estado }) {
    if (estado === 'asc') return <ChevronUp size={13} className="text-primary" />
    if (estado === 'desc') return <ChevronDown size={13} className="text-primary" />
    return <ChevronsUpDown size={13} className="text-grey-400" />
}

export default function DataTable({
    colunas,
    linhas,
    titulo,
    retratil = false,
    abertoInicial = true,
    altura = 'max-h-[420px]',
    vazio = 'Nenhum registro encontrado',
}) {
    const [ordem, setOrdem] = useState(null)
    const [aberto, setAberto] = useState(abertoInicial)
    const idConteudo = useId()

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

    return (
        <div className="flex w-full flex-col overflow-hidden rounded-lg border border-[#cbcbcb] bg-white">
            {titulo && (
                <Cabecalho
                    titulo={titulo}
                    quantidade={linhas.length}
                    retratil={retratil}
                    aberto={aberto}
                    idConteudo={idConteudo}
                    onAlternar={() => setAberto((atual) => !atual)}
                />
            )}

            {(!retratil || aberto) && (
            <div id={idConteudo} className={`overflow-auto ${altura}`}>
                <table className="w-full border-collapse text-[13px]">
                    <thead className="sticky top-0 z-10 bg-[#0E50A6] text-white">
                        <tr>
                            {colunas.map((coluna, indice) => {
                                const direita = alinhamentoDe(coluna, indice) === 'right'
                                const estado = ordem?.chave === coluna.chave ? ordem.direcao : null
                                return (
                                    <th
                                        key={coluna.chave}
                                        scope="col"
                                        aria-sort={estado ? (estado === 'asc' ? 'ascending' : 'descending') : 'none'}
                                        className={`whitespace-nowrap px-3 py-2 font-medium ${direita ? 'text-right' : 'text-left'}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => alternarOrdem(coluna.chave)}
                                            className={`flex w-full items-center gap-1 transition-colors hover:text-secondary-100 ${direita ? 'justify-end' : 'justify-start'}`}
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
                                className={`border-t border-[#eeeeee] transition-colors hover:bg-secondary-100 ${indiceLinha % 2 === 1 ? 'bg-[#F3F6FE]' : 'bg-white'}`}
                            >
                                {colunas.map((coluna, indice) => {
                                    const formatar = coluna.formato ?? formatos.texto
                                    return (
                                        <td
                                            key={coluna.chave}
                                            className={`whitespace-nowrap px-3 py-2 text-[#232323] ${alinhamentoDe(coluna, indice) === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
                                        >
                                            {formatar(linha[coluna.chave], linha)}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>

                    {totais && linhasOrdenadas.length > 0 && (
                        <tfoot className="sticky bottom-0 bg-white">
                            <tr className="border-t border-[#cbcbcb] font-semibold text-[#232323]">
                                {colunas.map((coluna, indice) => {
                                    const formatar = coluna.formato ?? formatos.texto
                                    return (
                                        <td
                                            key={coluna.chave}
                                            className={`whitespace-nowrap px-3 py-2 ${alinhamentoDe(coluna, indice) === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
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
    )
}

function Cabecalho({ titulo, quantidade, retratil, aberto, idConteudo, onAlternar }) {
    const conteudo = (
        <>
            {retratil && (
                <ChevronDown
                    size={16}
                    className={`text-primary transition-transform duration-200 ${aberto ? '' : '-rotate-90'}`}
                />
            )}
            <h3 className="text-[14px] font-semibold text-[#232323]">{titulo}</h3>
            <span className="text-[12px] text-grey-400">({numero.format(quantidade)} registros)</span>
        </>
    )

    if (!retratil) {
        return <div className="flex items-center gap-2 border-b border-[#eeeeee] px-4 py-3">{conteudo}</div>
    }

    return (
        <button
            type="button"
            onClick={onAlternar}
            aria-expanded={aberto}
            aria-controls={idConteudo}
            className={`flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-secondary-100/60 ${aberto ? 'border-b border-[#eeeeee]' : ''}`}
        >
            {conteudo}
        </button>
    )
}
