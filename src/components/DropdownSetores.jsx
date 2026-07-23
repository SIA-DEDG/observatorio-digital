import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'

const ORDEM_SETORES = ['Primário', 'Secundário', 'Terciário', 'Não classificado']
const posicaoSetor = (setor) => {
    const posicao = ORDEM_SETORES.indexOf(setor)
    return posicao === -1 ? ORDEM_SETORES.length : posicao
}

export default function DropdownSetores({
    label = 'Setor',
    placeholder = 'Todos',
    opcoesSetor = [],
    opcoesGrupo = [],
    setoresSelecionados = [],
    gruposSelecionados = [],
    onSetoresChange,
    onGruposChange,
    helper,
}) {
    const [open, setOpen] = useState(false)
    const [abrirParaCima, setAbrirParaCima] = useState(false)
    const [setoresExpandidos, setSetoresExpandidos] = useState(() => new Set())
    const containerRef = useRef(null)

    useEffect(() => {
        if (!open) return
        const fecharAoClicarFora = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
        }
        document.addEventListener('mousedown', fecharAoClicarFora)
        return () => document.removeEventListener('mousedown', fecharAoClicarFora)
    }, [open])

    const alternarAberto = () => {
        if (!open) {
            const area = containerRef.current?.getBoundingClientRect()
            if (area) {
                const espacoAbaixo = window.innerHeight - area.bottom
                setAbrirParaCima(espacoAbaixo < 320 && area.top > espacoAbaixo)
            }
        }
        setOpen((estaAberto) => !estaAberto)
    }

    const secoes = new Map()
    for (const opcao of opcoesSetor) secoes.set(opcao.value, [])
    for (const opcao of opcoesGrupo) {
        const setor = opcao.setor ?? 'Não classificado'
        const secao = secoes.get(setor) ?? []
        secoes.set(setor, secao)
        secao.push(opcao)
    }
    const secoesOrdenadas = [...secoes.entries()]
        .sort(([setorA], [setorB]) => posicaoSetor(setorA) - posicaoSetor(setorB) || setorA.localeCompare(setorB))

    const alternarExpansao = (setor) =>
        setSetoresExpandidos((atuais) => {
            const novos = new Set(atuais)
            if (novos.has(setor)) novos.delete(setor)
            else novos.add(setor)
            return novos
        })

    const alternarSetor = (setor) =>
        onSetoresChange?.(setoresSelecionados.includes(setor) ? [] : [setor])

    const alternarGrupo = (grupo) =>
        onGruposChange?.(gruposSelecionados.includes(grupo)
            ? gruposSelecionados.filter((item) => item !== grupo)
            : [...gruposSelecionados, grupo])

    const selecionados = [...setoresSelecionados, ...gruposSelecionados]
    const textoBotao = selecionados.length > 0 ? selecionados.join(', ') : placeholder

    return (
        <div ref={containerRef} className="flex min-w-[150px] flex-1 flex-col gap-1">
            <span className="text-[13px] text-grey-500">{label}</span>
            <div className="relative">
                <button
                    type="button"
                    onClick={alternarAberto}
                    className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-[#cbcbcb] bg-white px-3 text-[14px] transition-colors hover:border-primary"
                >
                    <span className={`truncate ${selecionados.length > 0 ? 'text-[#232323]' : 'text-grey-400'}`}>
                        {textoBotao}
                    </span>
                    <ChevronDown size={16} className={`shrink-0 text-grey-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                    <ul className={`absolute z-30 max-h-72 w-full overflow-auto rounded-md border border-[#cbcbcb] bg-white py-1 shadow-lg ${abrirParaCima ? 'bottom-full mb-1' : 'mt-1'}`}>
                        {secoesOrdenadas.length === 0 && (
                            <li className="px-3 py-2 text-[13px] text-grey-400">Nenhuma opção disponível</li>
                        )}
                        {secoesOrdenadas.map(([setor, grupos]) => {
                            const expandido = setoresExpandidos.has(setor)
                            const setorMarcado = setoresSelecionados.includes(setor)
                            return (
                                <li key={setor}>
                                    <div className={`flex w-full items-center gap-1 px-2 py-2 text-[14px] font-medium transition-colors hover:bg-secondary-100 ${setorMarcado ? 'bg-secondary-100 text-primary' : 'text-[#232323]'}`}>
                                        {grupos.length > 0
                                            ? (
                                                <button
                                                    type="button"
                                                    onClick={() => alternarExpansao(setor)}
                                                    aria-label={expandido ? `Recolher ${setor}` : `Expandir ${setor}`}
                                                    className="flex h-5 w-5 shrink-0 items-center justify-center text-grey-400 hover:text-primary"
                                                >
                                                    {expandido ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                </button>
                                            )
                                            : <span className="h-5 w-5 shrink-0" />}
                                        <button
                                            type="button"
                                            onClick={() => alternarSetor(setor)}
                                            className="flex flex-1 items-center justify-between gap-2 text-left"
                                        >
                                            {setor}
                                            {setorMarcado && <Check size={15} className="shrink-0 text-primary" />}
                                        </button>
                                    </div>
                                    {expandido && grupos.map((opcao) => {
                                        const grupoMarcado = gruposSelecionados.includes(opcao.value)
                                        return (
                                            <button
                                                key={opcao.value}
                                                type="button"
                                                onClick={() => alternarGrupo(opcao.value)}
                                                className={`flex w-full items-center justify-between gap-2 py-1.5 pl-9 pr-3 text-left text-[13px] transition-colors hover:bg-secondary-100 ${grupoMarcado ? 'bg-secondary-100 text-primary' : 'text-[#464646]'}`}
                                            >
                                                {opcao.label}
                                                {grupoMarcado && <Check size={14} className="shrink-0 text-primary" />}
                                            </button>
                                        )
                                    })}
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
            {helper && <span className="text-[11px] text-grey-400">{helper}</span>}
        </div>
    )
}
