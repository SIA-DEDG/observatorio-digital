import Dropdown from './Dropdown'
import PainelFiltros from './PainelFiltros'
import ToggleClassificacao from './ToggleClassificacao'

/**
 * Painel "Filtro" da Balança Comercial — acompanha a rolagem, conforme o design.
 * "Grupo" (temático, ncm_tic.grupo) e "Produto (SH4)" (família de produtos da
 * nomenclatura oficial) são níveis distintos e ficam em dropdowns encadeados.
 */
export default function FiltroBalanca({ periodo, grupo, produto, chips = [], onLimpar }) {
    return (
        <PainelFiltros chips={chips} onLimpar={onLimpar}>
            <div className="flex flex-col gap-2">
                <span className="text-[18px] text-[#232323]">Período</span>
                <div className="flex h-11 items-center gap-1 rounded-[8px] border border-[#d9d9d9] bg-white px-[10px] text-[14px] focus-within:border-primary">
                    <input
                        type="date"
                        aria-label="Início do período"
                        value={periodo.inicio}
                        onChange={(evento) => periodo.onChange('inicio', evento.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-[#232323] outline-none"
                    />
                    <span className="text-grey-400">–</span>
                    <input
                        type="date"
                        aria-label="Fim do período"
                        value={periodo.fim}
                        onChange={(evento) => periodo.onChange('fim', evento.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-[#232323] outline-none"
                    />
                </div>
            </div>

            <Dropdown
                variante="filtro"
                label="Grupo"
                placeholder="Todos os grupos"
                options={grupo.options}
                value={grupo.value}
                onChange={grupo.onChange}
                helper="Grupos temáticos de TIC"
                multiple
            />
            <ToggleClassificacao value={produto.modo} onChange={produto.onModoChange} />
            <Dropdown
                variante="filtro"
                label="Produto"
                placeholder="Selecione"
                options={produto.options}
                value={produto.value}
                onChange={produto.onChange}
                helper={
                    produto.modo === 'NCM'
                        ? 'Código de 8 dígitos; filtra pela família SH4 correspondente'
                        : 'Família de 4 dígitos com ao menos um NCM classificado'
                }
                multiple
                selecaoUnica
            />
        </PainelFiltros>
    )
}
