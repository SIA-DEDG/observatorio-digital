import Dropdown from './Dropdown'
import DropdownSetores from './DropdownSetores'
import { CORES_TERRITORIO, territorioDoMunicipio } from '../util/territoriosPI'
import { filtrarOpcoesProduto } from '../util/aggregationsV2'

const OPCOES_VAZIAS = { fluxo: [], pais: [], municipio: [], setor: [], grupo: [], produtos: [] }

const OPCOES_TERRITORIO = Object.entries(CORES_TERRITORIO)
    .map(([territorio, cor]) => ({ value: territorio, label: territorio, cor }))

export default function FilterSidebar({
    filters,
    onChange,
    options,
    territorios = [],
    onTerritoriosChange,
    municipios = [],
    onMunicipiosChange,
}) {
    const opcoes = options ?? OPCOES_VAZIAS
    const definirFiltro = (campo) => (valor) => onChange({ ...filters, [campo]: valor })

    const opcoesMunicipio = territorios.length > 0
        ? (opcoes.municipio ?? []).filter((opcao) => territorios.includes(territorioDoMunicipio(opcao.value)))
        : opcoes.municipio ?? []

    return (
        <aside className="sticky top-4 flex h-fit w-[287px] shrink-0 flex-col gap-[18px] rounded-[10px] border border-[#d9d9d9] bg-white p-4">
            <Dropdown
                label="Território"
                placeholder="Todos"
                options={OPCOES_TERRITORIO}
                value={territorios}
                onChange={(valores) => onTerritoriosChange?.(valores)}
                helper="Selecione até 5 territórios"
                multiple
                max={5}
            />
            <Dropdown
                label="Município"
                placeholder="Selecione"
                options={opcoesMunicipio}
                value={municipios}
                onChange={(valores) => onMunicipiosChange?.(valores)}
                helper={territorios.length > 0 ? 'Municípios dos territórios selecionados' : 'Selecione até 5 municípios'}
                multiple
                max={5}
            />
            <Dropdown label="Fluxo" placeholder="Todos" options={opcoes.fluxo ?? []} value={filters.fluxo} onChange={definirFiltro('fluxo')} multiple />
            <Dropdown label="País" placeholder="Todos" options={opcoes.pais ?? []} value={filters.pais} onChange={definirFiltro('pais')} multiple />
            <div className="flex flex-col gap-1">
                <span className="text-[13px] text-grey-500">Período</span>
                <div className="flex h-9 items-center gap-1 rounded-md border border-[#cbcbcb] bg-white px-3 text-[14px] focus-within:border-primary">
                    <input
                        type="date"
                        value={filters.inicio}
                        onChange={(evento) => definirFiltro('inicio')(evento.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-[#232323] outline-none"
                    />
                    <span className="text-grey-400">-</span>
                    <input
                        type="date"
                        value={filters.fim}
                        onChange={(evento) => definirFiltro('fim')(evento.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-[#232323] outline-none"
                    />
                </div>
            </div>
            <DropdownSetores
                label="Setor"
                placeholder="Todos"
                opcoesSetor={opcoes.setor ?? []}
                opcoesGrupo={opcoes.grupo ?? []}
                setoresSelecionados={filters.setor}
                gruposSelecionados={filters.grupo ?? []}
                onSetoresChange={definirFiltro('setor')}
                onGruposChange={definirFiltro('grupo')}
                helper="Marque o setor inteiro ou expanda e escolha grupos"
            />
            <Dropdown
                label="Produto"
                placeholder="Todos"
                options={filtrarOpcoesProduto(opcoes.produtos ?? [], filters.setor, filters.grupo)}
                value={filters.produtos}
                onChange={definirFiltro('produtos')}
                helper={filters.setor.length > 0 || filters.grupo?.length > 0 ? 'Produtos da seleção de setor/grupo' : undefined}
                multiple
                selecaoUnica
            />
        </aside>
    )
}
