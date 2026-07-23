import { useEffect, useMemo, useState } from 'react'
import BalancaView from './BalancaView'
import { montarBalanca } from '../util/balanca'
import {
    carregarDatasetV2,
    opcoesFiltrosV2,
    aplicarFiltrosV2,
    filtrarOpcoesProduto,
    FILTROS_INICIAIS_V2,
} from '../util/aggregationsV2'

const FILTROS_INICIAIS = { inicio: '', fim: '', setor: [], grupo: [], produtos: [] }

export default function BalancaComercial({ children }) {
    const [filtros, setFiltros] = useState(FILTROS_INICIAIS)
    const [dataset, setDataset] = useState(null)
    const [erroCarga, setErroCarga] = useState(null)

    useEffect(() => {
        carregarDatasetV2()
            .then(setDataset)
            .catch((erro) => { console.error('carregarDatasetV2:', erro.message); setErroCarga(erro.message) })
    }, [])

    const opcoesFiltros = useMemo(() => (dataset ? opcoesFiltrosV2(dataset) : null), [dataset])

    const opcoesProduto = filtrarOpcoesProduto(opcoesFiltros?.produtos ?? [], filtros.setor, filtros.grupo)
    const temFiltroProduto = filtros.setor.length > 0 || filtros.grupo.length > 0 || filtros.produtos.length > 0
    const balanca = useMemo(() => {
        if (!dataset) return null
        const periodo = { ...FILTROS_INICIAIS_V2, inicio: filtros.inicio, fim: filtros.fim }
        const saldoTradicional = aplicarFiltrosV2(dataset, periodo)
        const saldoRecorte = aplicarFiltrosV2(dataset, { ...periodo, setor: filtros.setor, grupo: filtros.grupo, produtos: filtros.produtos })
        return montarBalanca(saldoTradicional, saldoRecorte)
    }, [dataset, filtros])

    const periodo = filtros.inicio || filtros.fim ? `${filtros.inicio || '...'} a ${filtros.fim || '...'}` : 'todo o período'

    if (erroCarga) {
        return (
            <div className="rounded-lg border border-danger bg-red-50 px-4 py-3 text-[13px] text-danger">
                Falha ao carregar dados do banco: {erroCarga}
            </div>
        )
    }

    return (
        <BalancaView
            carregando={!dataset}
            balanca={balanca}
            temFiltro={temFiltroProduto}
            periodo={periodo}
            inicio={filtros.inicio}
            fim={filtros.fim}
            onPeriodoChange={(campo, valor) => setFiltros({ ...filtros, [campo]: valor })}
            setor={{ options: opcoesFiltros?.setor ?? [], value: filtros.setor, onChange: (valores) => setFiltros({ ...filtros, setor: valores }) }}
            grupo={{ options: opcoesFiltros?.grupo ?? [], value: filtros.grupo, onChange: (valores) => setFiltros({ ...filtros, grupo: valores }) }}
            produto={{ options: opcoesProduto, value: filtros.produtos, onChange: (valores) => setFiltros({ ...filtros, produtos: valores }) }}
        >
            {children}
        </BalancaView>
    )
}
