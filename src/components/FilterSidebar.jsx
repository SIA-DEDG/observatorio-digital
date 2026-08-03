import Dropdown from './Dropdown'
import PainelFiltros from './PainelFiltros'
import ToggleClassificacao from './ToggleClassificacao'
import { CORES_TERRITORIO, territorioDoMunicipio } from '../util/territoriosPI'
import { opcoesProdutoSh4, opcoesProdutoNcm } from '../util/aggregationsV2'

const OPCOES_VAZIAS = { fluxo: [], pais: [], municipio: [], setor: [], grupo: [], produtos: [] }

const OPCOES_TERRITORIO = Object.entries(CORES_TERRITORIO)
    .map(([territorio, cor]) => ({ value: territorio, label: territorio, cor }))

export default function FilterSidebar({
    filters,
    onChange,
    options,
    catalogoNcm = [],
    classificacao = 'NCM',
    onClassificacaoChange,
    territorios = [],
    onTerritoriosChange,
    municipios = [],
    onMunicipiosChange,
    chips = [],
    onLimpar,
}) {
    const opcoes = options ?? OPCOES_VAZIAS
    const definirFiltro = (campo) => (valor) => onChange({ ...filters, [campo]: valor })

    const opcoesMunicipio = territorios.length > 0
        ? (opcoes.municipio ?? []).filter((opcao) => territorios.includes(territorioDoMunicipio(opcao.value)))
        : opcoes.municipio ?? []

    const grupos = filters.grupo ?? []
    const opcoesProduto = classificacao === 'NCM'
        ? opcoesProdutoNcm(opcoes.produtos ?? [], grupos, catalogoNcm)
        : opcoesProdutoSh4(opcoes.produtos ?? [], grupos)

    return (
        <PainelFiltros chips={chips} onLimpar={onLimpar}>
            <Dropdown variante="filtro" label="Fluxo" placeholder="Selecione" options={opcoes.fluxo ?? []} value={filters.fluxo} onChange={definirFiltro('fluxo')} multiple />
            <Dropdown variante="filtro" label="País" placeholder="Selecione" options={opcoes.pais ?? []} value={filters.pais} onChange={definirFiltro('pais')} multiple />
            <Dropdown
                variante="filtro"
                label="Município"
                placeholder="Selecione"
                options={opcoesMunicipio}
                value={municipios}
                onChange={(valores) => onMunicipiosChange?.(valores)}
                helper={territorios.length > 0 ? 'Municípios dos territórios selecionados' : 'Selecione até 5 municípios'}
                multiple
                max={5}
            />
            <div className="flex flex-col gap-2">
                <span className="text-[18px] text-[#232323]">Período</span>
                <div className="flex h-11 items-center gap-1 rounded-[8px] border border-[#d9d9d9] bg-white px-[10px] text-[14px] focus-within:border-primary">
                    <input
                        type="date"
                        aria-label="Início do período"
                        value={filters.inicio}
                        onChange={(evento) => definirFiltro('inicio')(evento.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-[#232323] outline-none"
                    />
                    <span className="text-grey-400">–</span>
                    <input
                        type="date"
                        aria-label="Fim do período"
                        value={filters.fim}
                        onChange={(evento) => definirFiltro('fim')(evento.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-[#232323] outline-none"
                    />
                </div>
            </div>
            <ToggleClassificacao value={classificacao} onChange={onClassificacaoChange} />
            <Dropdown
                variante="filtro"
                label="Grupo"
                placeholder="Selecione"
                options={opcoes.grupo ?? []}
                value={grupos}
                onChange={(valores) => onChange({ ...filters, grupo: valores, produtos: [] })}
                helper="Grupos temáticos de TIC"
                multiple
            />
            <Dropdown
                variante="filtro"
                label="Produto"
                placeholder="Selecione"
                options={opcoesProduto}
                value={filters.produtos}
                onChange={definirFiltro('produtos')}
                helper={grupos.length > 0 ? `Somente os produtos de ${grupos.join(', ')}` : undefined}
                multiple
                selecaoUnica
            />
            <Dropdown
                variante="filtro"
                label="Território"
                placeholder="Selecione"
                options={OPCOES_TERRITORIO}
                value={territorios}
                onChange={(valores) => onTerritoriosChange?.(valores)}
                helper="Selecione até 5 territórios"
                multiple
                max={5}
            />
        </PainelFiltros>
    )
}
