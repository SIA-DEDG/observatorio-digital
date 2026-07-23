import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'

const normalizar = (texto) => String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function Dropdown({ label, placeholder = 'Selecione', options = [], value, onChange, helper, multiple = false, max, selecaoUnica = false }) {
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

    const opcoesVisiveis = busca
        ? options.filter((option) => normalizar(option.label).includes(normalizar(busca)))
        : options

    const opcaoSelecionada = options.find((option) => option.value === value)
    const hasSelection = multiple ? selected.length > 0 : Boolean(opcaoSelecionada)
    const buttonText = multiple
        ? (selected.length > 0
            ? options.filter((option) => selected.includes(option.value)).map((option) => option.label).join(', ')
            : placeholder)
        : (opcaoSelecionada ? opcaoSelecionada.label : placeholder)

    return (
        <div ref={containerRef} className="flex min-w-[150px] flex-1 flex-col gap-1">
            <span className="text-[13px] text-grey-500">{label}</span>
            <div className="relative">
                <button
                    type="button"
                    onClick={alternarAberto}
                    className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-[#cbcbcb] bg-white px-3 text-[14px] transition-colors hover:border-primary"
                >
                    <span className={`truncate ${hasSelection ? 'text-[#232323]' : 'text-grey-400'}`}>
                        {buttonText}
                    </span>
                    <ChevronDown size={16} className={`shrink-0 text-grey-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                    <ul className={`absolute z-30 max-h-60 w-full overflow-auto rounded-md border border-[#cbcbcb] bg-white py-1 shadow-lg ${abrirParaCima ? 'bottom-full mb-1' : 'mt-1'}`}>
                        <li className="sticky top-0 z-10 border-b border-[#eeeeee] bg-white px-2 py-1.5">
                            <div className="flex items-center gap-1.5 rounded-md border border-[#cbcbcb] px-2">
                                <Search size={13} className="shrink-0 text-grey-400" />
                                <input
                                    ref={buscaRef}
                                    type="text"
                                    value={busca}
                                    placeholder="Digite para buscar…"
                                    onChange={(event) => setBusca(event.target.value)}
                                    className="h-7 w-full bg-transparent text-[13px] text-[#232323] outline-none"
                                />
                            </div>
                        </li>
                        {opcoesVisiveis.length === 0 ? (
                            <li className="px-3 py-2 text-[13px] text-grey-400">
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
                                            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[14px] transition-colors hover:bg-secondary-100 ${checked ? 'bg-secondary-100 text-primary' : 'text-[#232323]'} ${disabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : ''}`}
                                        >
                                            <span className="flex items-center gap-2">
                                                {option.cor && (
                                                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: option.cor }} />
                                                )}
                                                {option.label}
                                            </span>
                                            {multiple && checked && <Check size={15} className="shrink-0 text-primary" />}
                                        </button>
                                    </li>
                                )
                            })
                        )}
                    </ul>
                )}
            </div>
            {helper && <span className="text-[11px] text-grey-400">{helper}</span>}
        </div>
    )
}
