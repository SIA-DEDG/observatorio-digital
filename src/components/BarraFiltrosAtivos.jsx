import { Filter, X } from 'lucide-react'

/**
 * Barra "Filtros ativos" do design. Cada aba monta seus próprios chips, para que
 * remover um chip e "Limpar todos" atuem sobre os filtros daquela aba.
 */
export default function BarraFiltrosAtivos({ chips, onLimparTudo }) {
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[#d9d9d9] bg-white px-3 py-2">
            <div className="flex items-center gap-2 text-[14px] text-grey-500">
                <Filter size={16} />
                <span>Filtros ativos:</span>
            </div>
            {chips.length === 0
                ? <span className="text-[13px] text-grey-400">Nenhum</span>
                : chips.map((chip) => (
                    <span key={chip.chave} className="flex items-center gap-1.5 rounded-full bg-secondary-100 px-3 py-1 text-[13px] text-[#232323]">
                        {chip.rotulo}
                        <button type="button" aria-label={`Remover ${chip.rotulo}`} onClick={chip.remover} className="flex">
                            <X size={14} className="text-danger" />
                        </button>
                    </span>
                ))}
            <button
                type="button"
                onClick={onLimparTudo}
                disabled={chips.length === 0}
                className="ml-auto flex items-center gap-1.5 rounded-full border border-danger px-3 py-1 text-[14px] text-danger transition-colors enabled:hover:bg-danger enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
                <X size={14} /> Limpar todos
            </button>
        </div>
    )
}
