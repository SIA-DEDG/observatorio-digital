import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'

const normalizar = (texto) => String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// 'padrao' é a barra de filtros do Detalhamento; 'filtro' é o painel lateral da Balança Comercial
const VARIANTES = {
    padrao: { rotulo: 'text-[13px] text-texto-2', campo: 'h-9 rounded-md border-borda-forte px-3 text-[14px]' },
    filtro: { rotulo: 'text-[18px] text-texto-1', campo: 'h-11 rounded-[8px] border-borda px-[10px] text-[16px]' },
}

export default function Dropdown({ label, placeholder = 'Selecione', options = [], value, onChange, helper, multiple = false, max, selecaoUnica = false, variante = 'padrao' }) {
    const [open, setOpen] = useState(false)
    const [abrirParaCima, setAbrirParaCima] = useState(false)
    const [busca, setBusca] = useState('')
    const containerRef = useRef(null)
    const buscaRef = useRef(null)

    const alternarAberto = () => {
        if (!open) {
            const area = containerRef.current?.getBoundingClientRect()
            if (area) {
                const espacoAbaixo = window.innerHeight - area.bottom
                setAbrirParaCima(espacoAbaixo < 280 && area.top > espacoAbaixo)
            }
        }
        setOpen((estaAberto) => !estaAberto)
    }

    useEffect(() => {
        if (open) {
            setBusca('')
            buscaRef.current?.focus()
        }
    }, [open])

    useEffect(() => {
        if (!open) return
        const fecharAoClicarFora = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
        }
        document.addEventListener('mousedown', fecharAoClicarFora)
        return () => document.removeEventListener('mousedown', fecharAoClicarFora)
    }, [open])

    const selected = multiple ? (Array.isArray(value) ? value : []) : []
    const limitReached = multiple && typeof max === 'number' && selected.length >= max

    const isSelected = (option) =>
        multiple ? selected.includes(option.value) : option.value === value

    const toggle = (option) => {
        if (multiple) {
            if (selecaoUnica) {
                onChange?.(selected.includes(option.value) ? [] : [option.value])
                setOpen(false)
            } else if (selected.includes(option.value)) {
                onChange?.(selected.filter((item) => item !== option.value))
            } else if (!limitReached) {
                onChange?.([...selected, option.value])
            }
        } else {
            onChange?.(option.value)
            setOpen(false)
        }
    }

    // `option.busca` leva formas alternativas do código (ex.: NCM sem pontuação)
    const opcoesVisiveis = busca
        ? options.filter((option) => normalizar(`${option.label} ${option.busca ?? ''}`).includes(normalizar(busca)))
        : options

    const opcaoSelecionada = options.find((option) => option.value === value)
    const hasSelection = multiple ? selected.length > 0 : Boolean(opcaoSelecionada)
    const buttonText = multiple
        ? (selected.length > 0
            ? options.filter((option) => selected.includes(option.value)).map((option) => option.label).join(', ')
            : placeholder)
        : (opcaoSelecionada ? opcaoSelecionada.label : placeholder)

    const estilo = VARIANTES[variante] ?? VARIANTES.padrao

    return (
        <div ref={containerRef} className="flex min-w-[150px] flex-1 flex-col gap-1">
            <span className={estilo.rotulo}>{label}</span>
            <div className="relative">
                <button
                    type="button"
                    onClick={alternarAberto}
                    className={`flex w-full items-center justify-between gap-2 border bg-superficie-1 transition-colors hover:border-marca-texto ${estilo.campo}`}
                >
                    <span className={`truncate ${hasSelection ? 'text-texto-1' : 'text-texto-3'}`}>
                        {buttonText}
                    </span>
                    <ChevronDown size={16} className={`shrink-0 text-texto-3 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                    <ul className={`absolute z-30 max-h-60 w-full overflow-auto rounded-md border border-borda-forte bg-superficie-2 py-1 shadow-lg ${abrirParaCima ? 'bottom-full mb-1' : 'mt-1'}`}>
                        <li className="sticky top-0 z-10 border-b border-borda-sutil bg-superficie-2 px-2 py-1.5">
                            <div className="flex items-center gap-1.5 rounded-md border border-borda-forte px-2">
                                <Search size={13} className="shrink-0 text-texto-3" />
                                <input
                                    ref={buscaRef}
                                    type="text"
                                    value={busca}
                                    placeholder="Digite para buscar…"
                                    onChange={(event) => setBusca(event.target.value)}
                                    className="h-7 w-full bg-transparent text-[13px] text-texto-1 outline-none"
                                />
                            </div>
                        </li>
                        {multiple && selected.length > 0 && (
                            <li className="border-b border-borda-sutil">
                                <button
                                    type="button"
                                    onClick={() => { onChange?.([]); setOpen(false) }}
                                    className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[13px] text-estado-erro transition-colors hover:bg-superficie-3"
                                >
                                    <X size={13} className="shrink-0" />
                                    Limpar seleção ({selected.length})
                                </button>
                            </li>
                        )}
                        {opcoesVisiveis.length === 0 ? (
                            <li className="px-3 py-2 text-[13px] text-texto-3">
                                {busca ? 'Nenhuma opção encontrada' : 'Nenhuma opção disponível'}
                            </li>
                        ) : (
                            opcoesVisiveis.map((option) => {
                                const checked = isSelected(option)
                                const disabled = multiple && !checked && limitReached
                                return (
                                    <li key={option.value}>
                                        <button
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => toggle(option)}
                                            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[14px] transition-colors hover:bg-superficie-3 ${checked ? 'bg-marca-suave text-marca-texto' : 'text-texto-1'} ${disabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : ''}`}
                                        >
                                            <span className="flex items-center gap-2">
                                                {option.cor && (
                                                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: option.cor }} />
                                                )}
                                                {option.label}
                                            </span>
                                            {multiple && checked && <Check size={15} className="shrink-0 text-marca-texto" />}
                                        </button>
                                    </li>
                                )
                            })
                        )}
                    </ul>
                )}
            </div>
            {helper && <span className="text-[11px] text-texto-3">{helper}</span>}
        </div>
    )
}
