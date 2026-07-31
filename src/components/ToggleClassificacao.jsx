const MODOS = ['NCM', 'SH4']

/**
 * Campo "Classificação" do design: alterna o nível do código dos produtos entre
 * NCM (8 dígitos) e SH4 (família de 4 dígitos).
 */
export default function ToggleClassificacao({ label = 'Classificação', value, onChange }) {
    return (
        <div className="flex flex-col gap-[7px]">
            <span className="text-[18px] text-[#232323]">{label}</span>
            <div className="flex w-full items-center" role="group" aria-label={label}>
                {MODOS.map((modo, indice) => {
                    const ativo = value === modo
                    return (
                        <button
                            key={modo}
                            type="button"
                            aria-pressed={ativo}
                            onClick={() => onChange?.(modo)}
                            className={`flex h-[34px] flex-1 items-center justify-center border border-[#d9d9d9] px-4 text-[16px] transition-colors ${indice === 0 ? 'rounded-l-[8px]' : 'rounded-r-[8px] border-l-0'} ${ativo
                                ? 'bg-primary font-medium text-white'
                                : 'bg-white text-[#989898] hover:bg-secondary-100'}`}
                        >
                            {modo}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
