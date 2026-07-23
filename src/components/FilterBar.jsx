import { Calendar, RefreshCw, Filter, X } from 'lucide-react'
import Dropdown from './Dropdown'
import { CORES_TERRITORIO } from '../util/territoriosPI'

const OPCOES_TERRITORIO = Object.entries(CORES_TERRITORIO)
    .map(([territorio, cor]) => ({ value: territorio, label: territorio, cor }))

const EMPTY_OPTIONS = {
    nivel: [],
    fluxo: [],
    bloco: [],
    pais: [],
    categoria: [],
    produtos: [],
}

const NIVEL_OPTIONS = [
    { value: 'bloco', label: 'Bloco Econômico' },
    { value: 'brasil', label: 'Brasil' },
    { value: 'piaui', label: 'Piauí' },
]

export const INITIAL_STATE = {
    nivel: 'bloco',
    inicio: '',
    fim: '',
    fluxo: [],
    bloco: [],
    pais: [],
    categoria: [],
    produtos: [],
}

function DateRangeField({ label, start, end, onStartChange, onEndChange }) {
    return (
        <div className="flex min-w-[190px] flex-1 flex-col gap-1">
            <span className="text-[13px] text-grey-500">{label}</span>
            <div className="flex h-9 items-center gap-1 rounded-md border border-[#cbcbcb] bg-white px-3 text-[14px] text-[#666666] focus-within:border-primary">
                <input
                    type="date"
                    value={start}
                    onChange={(event) => onStartChange(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[#232323] outline-none [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <span className="text-grey-400">-</span>
                <input
                    type="date"
                    value={end}
                    onChange={(event) => onEndChange(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[#232323] outline-none [&::-webkit-calendar-picker-indicator]:hidden"
                />
            </div>
        </div>
    )
}

function Chip({ label, onRemove }) {
    return (
        <span className="flex items-center gap-1.5 rounded-full bg-secondary-100 px-3 py-1 text-[13px] text-[#232323]">
            {label}
            <button type="button" className="flex" aria-label={`Remover ${label}`} onClick={onRemove}>
                <X size={14} className="text-danger" />
            </button>
        </span>
    )
}

export default function FilterBar({ filters, onChange, options, territorios = [], onTerritoriosChange }) {
    const opcoes = options ?? EMPTY_OPTIONS
    const definirFiltro = (field) => (value) => onChange({ ...filters, [field]: value })
    const limparTodos = () => {
        onChange(INITIAL_STATE)
        onTerritoriosChange?.([])
    }

    const municipioMode = filters.nivel === 'piaui'
    const geoLabel = municipioMode ? 'Município' : 'País'
    const geoOptions = (municipioMode ? opcoes.municipio : opcoes.pais) ?? []
    const blocoLabel = municipioMode ? 'Região' : 'Bloco econômico'
    const blocoOptions = (municipioMode ? opcoes.regiao : opcoes.bloco) ?? []
    const definirNivel = (value) => onChange({ ...filters, nivel: value, pais: [], bloco: [] })

    const rotuloOpcao = (list, value) => list.find((option) => option.value === value)?.label ?? value
    const filtrosAtivos = []
    if (municipioMode) {
        for (const territorio of territorios) {
            filtrosAtivos.push({ key: `territorio:${territorio}`, field: 'territorio', value: territorio, label: `Território: ${territorio}` })
        }
    }
    if (filters.inicio || filters.fim) filtrosAtivos.push({ key: 'periodo', field: 'periodo', label: `Período: ${filters.inicio || '...'} a ${filters.fim || '...'}` })
    const adicionarChips = (field, prefix, list) =>
        filters[field].forEach((value) => filtrosAtivos.push({ key: `${field}:${value}`, field, value, label: `${prefix}: ${rotuloOpcao(list, value)}` }))
    adicionarChips('fluxo', 'Fluxo', opcoes.fluxo ?? [])
    adicionarChips('bloco', blocoLabel, blocoOptions)
    adicionarChips('pais', geoLabel, geoOptions)
    adicionarChips('categoria', 'Categoria', opcoes.categoria ?? [])
    adicionarChips('produtos', 'Produtos', opcoes.produtos ?? [])

    const removerFiltro = (item) => {
        if (item.field === 'territorio') onTerritoriosChange?.(territorios.filter((territorio) => territorio !== item.value))
        else if (item.field === 'periodo') onChange({ ...filters, inicio: '', fim: '' })
        else onChange({ ...filters, [item.field]: filters[item.field].filter((value) => value !== item.value) })
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex overflow-hidden rounded-sm">
                <div className="w-1.5 bg-primary" />
                <div className="flex flex-1 flex-wrap items-center gap-x-10 gap-y-2 bg-secondary-100 px-4 py-3">
                    <div className="flex items-center gap-2 text-[14px] text-grey-500">
                        <Calendar size={18} className="text-primary" />
                        <span>Período dos dados: <strong className="text-[#232323]">01/03/2020 a 26/02/2025</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-[14px] text-grey-500">
                        <RefreshCw size={16} className="text-primary" />
                        <span>Atualizado: <strong className="text-[#232323]">01/08/2026, 10:34</strong></span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col rounded-lg border border-[#d9d9d9] bg-white">
                <div className="flex flex-wrap items-start gap-4 px-4 pt-8 pb-4">
                    <Dropdown label="Nível" placeholder="Selecione o nível" options={NIVEL_OPTIONS} value={filters.nivel} onChange={definirNivel} />
                    <DateRangeField
                        label="Período"
                        start={filters.inicio}
                        end={filters.fim}
                        onStartChange={definirFiltro('inicio')}
                        onEndChange={definirFiltro('fim')}
                    />
                    {municipioMode && onTerritoriosChange && (
                        <Dropdown
                            label="Território"
                            placeholder="Todos"
                            options={OPCOES_TERRITORIO}
                            value={territorios}
                            onChange={onTerritoriosChange}
                            helper="Selecione até 5 territórios"
                            multiple
                            max={5}
                        />
                    )}
                    <Dropdown label="Fluxo" placeholder="Todos" options={opcoes.fluxo ?? []} value={filters.fluxo} onChange={definirFiltro('fluxo')} multiple />
                    <Dropdown label={blocoLabel} placeholder="Nenhum" options={blocoOptions} value={filters.bloco} onChange={definirFiltro('bloco')} multiple />
                    <Dropdown label={geoLabel} placeholder="Nenhum" options={geoOptions} value={filters.pais} onChange={definirFiltro('pais')} helper={`Selecione até 5 ${municipioMode ? 'municípios' : 'países'}`} multiple max={5} />
                    <Dropdown label="Categoria de Produto" placeholder="Nenhum" options={opcoes.categoria ?? []} value={filters.categoria} onChange={definirFiltro('categoria')} multiple />
                    <Dropdown label="Produtos" placeholder="Nenhum" options={opcoes.produtos ?? []} value={filters.produtos} onChange={definirFiltro('produtos')} multiple />
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-[#eeeeee] px-4 py-3">
                    <div className="flex items-center gap-2 text-[14px] text-grey-500">
                        <Filter size={16} />
                        <span>Filtros ativos:</span>
                    </div>
                    {filtrosAtivos.length === 0
                        ? <span className="text-[13px] text-grey-400">Nenhum</span>
                        : filtrosAtivos.map((item) => <Chip key={item.key} label={item.label} onRemove={() => removerFiltro(item)} />)}
                    <button
                        type="button"
                        onClick={limparTodos}
                        className="ml-auto flex items-center gap-1.5 rounded-full border border-danger px-3 py-1 text-[14px] text-danger transition-colors hover:bg-danger hover:text-white"
                    >
                        <X size={14} /> Limpar todos
                    </button>
                </div>
            </div>
        </div>
    )
}
