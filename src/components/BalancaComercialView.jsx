import CardsBalanca from './CardsBalanca'
import FiltroBalanca from './FiltroBalanca'
import SaldoComercialChart from './SaldoComercialChart'
import TreemapGrupoProduto from './TreemapGrupoProduto'
import CatalogoProdutos from './CatalogoProdutos'
import BarraFiltrosAtivos from './BarraFiltrosAtivos'
import Carregando from './Carregando'

export default function BalancaComercialView({
    carregando,
    balanca,
    rotuloRecorte,
    periodo,
    intervaloAnos,
    chips,
    onLimparTudo,
    filtro,
    treemap,
    catalogo,
    children,
}) {
    const vazio = carregando || !balanca

    return (
        <div className="flex flex-col gap-5">
            {vazio
                ? <Carregando altura="h-[172px]" />
                : (
                    <CardsBalanca
                        totais={balanca.totais}
                        tendencia={balanca.tendencia}
                        rotuloRecorte={rotuloRecorte}
                        periodo={intervaloAnos}
                    />
                )}

            {children}

            <BarraFiltrosAtivos chips={chips} onLimparTudo={onLimparTudo} />

            <div className="flex flex-col items-start gap-4 lg:flex-row">
                <FiltroBalanca {...filtro} chips={chips} onLimpar={onLimparTudo} />

                <div className="flex w-full min-w-0 flex-1 flex-col gap-[25px] rounded-[10px] border border-[#d9d9d9] bg-white p-4 lg:p-6">
                    {vazio
                        ? <Carregando altura="h-[420px]" />
                        : (
                            <>
                                <SaldoComercialChart
                                    balanca={balanca}
                                    rotuloRecorte={rotuloRecorte}
                                    periodo={periodo}
                                />
                                <TreemapGrupoProduto {...treemap} />
                                <CatalogoProdutos linhas={catalogo} />
                            </>
                        )}
                </div>
            </div>
        </div>
    )
}
