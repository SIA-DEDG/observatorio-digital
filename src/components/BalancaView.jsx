import Dropdown from './Dropdown'
import DropdownSetores from './DropdownSetores'
import BalancaCards from './BalancaCards'
import SaldoChart from './SaldoChart'
import Carregando from './Carregando'

export default function BalancaView({
    carregando,
    balanca,
    temFiltro,
    periodo,
    inicio,
    fim,
    onPeriodoChange,
    setor,
    grupo,
    produto,
    children,
}) {
    return (
        <div className="flex flex-col gap-4">
            {carregando || !balanca
                ? <Carregando altura="h-[89px]" />
                : <BalancaCards totais={balanca.totais} temFiltro={temFiltro} periodo={periodo} />}

            {children}

            <div className="flex flex-col items-start gap-4 lg:flex-row">
                <aside className="flex w-full shrink-0 flex-col gap-[18px] rounded-[10px] border border-[#d9d9d9] bg-white p-4 lg:sticky lg:top-4 lg:w-[287px]">
                    <div className="flex flex-col gap-1">
                        <span className="text-[13px] text-grey-500">Período</span>
                        <div className="flex h-9 items-center gap-1 rounded-md border border-[#cbcbcb] bg-white px-3 text-[14px] focus-within:border-primary">
                            <input
                                type="date"
                                value={inicio}
                                onChange={(evento) => onPeriodoChange('inicio', evento.target.value)}
                                className="min-w-0 flex-1 bg-transparent text-[#232323] outline-none"
                            />
                            <span className="text-grey-400">-</span>
                            <input
                                type="date"
                                value={fim}
                                onChange={(evento) => onPeriodoChange('fim', evento.target.value)}
                                className="min-w-0 flex-1 bg-transparent text-[#232323] outline-none"
                            />
                        </div>
                    </div>
                    <DropdownSetores
                        label="Setor"
                        placeholder="Selecione"
                        opcoesSetor={setor.options}
                        opcoesGrupo={grupo?.options ?? []}
                        setoresSelecionados={setor.value}
                        gruposSelecionados={grupo?.value ?? []}
                        onSetoresChange={setor.onChange}
                        onGruposChange={grupo?.onChange}
                        helper="Marque o setor inteiro ou expanda e escolha grupos"
                    />
                    <Dropdown
                        label="Produto"
                        placeholder="Selecione"
                        options={produto.options}
                        value={produto.value}
                        onChange={produto.onChange}
                        multiple
                        selecaoUnica
                    />
                </aside>

                <div className="min-h-[420px] w-full min-w-0 flex-1 rounded-[10px] border border-[#d9d9d9] bg-white">
                    {carregando || !balanca
                        ? <Carregando altura="h-[420px]" />
                        : <SaldoChart balanca={balanca} temFiltro={temFiltro} periodo={periodo} />}
                </div>
            </div>
        </div>
    )
}
