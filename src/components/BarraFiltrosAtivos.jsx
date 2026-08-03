import { Filter, X } from 'lucide-react'

/** Chip removível de um filtro ativo — a barra e o painel mobile usam o mesmo. */
export function ChipFiltro({ chip }) {
    return (
        <span className="flex items-center gap-1.5 rounded-full bg-marca-suave px-3 py-1 text-[13px] text-texto-1">
            {chip.rotulo}
            <button type="button" aria-label={`Remover ${chip.rotulo}`} onClick={chip.remover} className="flex">
                <X size={14} className="text-danger" />
            </button>
        </span>
    )
}

/**
 * Barra "Filtros ativos" do design. Cada aba monta seus próprios chips, para que
 * remover um chip e "Limpar todos" atuem sobre os filtros daquela aba.
 *
 * Abaixo de `lg` a barra fica só com a contagem: em tela estreita os chips
 * empurravam o conteúdo para baixo, então eles passam a morar dentro do painel
 * de filtros, que é de onde se mexe neles no mobile.
 */
export default function BarraFiltrosAtivos({ chips, onLimparTudo }) {
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-borda bg-superficie-1 px-3 py-2">
            <div className="flex items-center gap-2 text-[14px] text-grey-500">
                <Filter size={16} />
                <span>Filtros ativos:</span>
            </div>

            <span className="text-[13px] text-grey-400 lg:hidden">
                {chips.length === 0 ? 'Nenhum' : chips.length}
            </span>

            <div className="hidden flex-wrap items-center gap-2 lg:flex">
                {chips.length === 0
                    ? <span className="text-[13px] text-grey-400">Nenhum</span>
                    : chips.map((chip) => <ChipFiltro key={chip.chave} chip={chip} />)}
            </div>

            {/*
              * O ml-auto só entra a partir de sm: em barra estreita ele empurrava o
              * botão sozinho para a direita da linha de baixo, deixando um vão.
              */}
            <button
                type="button"
                onClick={onLimparTudo}
                disabled={chips.length === 0}
                className="flex items-center gap-1.5 rounded-full border border-danger px-3 py-1 text-[14px] text-danger transition-colors enabled:hover:bg-danger enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto"
            >
                <X size={14} /> Limpar todos
            </button>
        </div>
    )
}
