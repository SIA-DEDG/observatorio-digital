const somaPorAno = (registros) => {
    const porAno = new Map()
    for (const registro of registros) {
        const agregado = porAno.get(registro.ano) ?? { exportado: 0, importado: 0 }
        if (registro.fluxo === 'Exportacao') agregado.exportado += Number(registro.fob_usd)
        if (registro.fluxo === 'Importacao') agregado.importado += Number(registro.fob_usd)
        porAno.set(registro.ano, agregado)
    }
    return porAno
}

const somaTotal = (porAno) => {
    let exportado = 0
    let importado = 0
    for (const agregado of porAno.values()) {
        exportado += agregado.exportado
        importado += agregado.importado
    }
    return { exportado, importado }
}

export function montarBalanca(registrosTradicional, registrosFiltrados) {
    const tradicional = somaPorAno(registrosTradicional)
    const filtrado = somaPorAno(registrosFiltrados)
    const anos = [...new Set([...tradicional.keys(), ...filtrado.keys()])].sort((a, b) => a - b)
    const saldoDoAno = (porAno, ano) => {
        const agregado = porAno.get(ano)
        return agregado ? agregado.exportado - agregado.importado : 0
    }
    const totalTradicional = somaTotal(tradicional)
    const totalFiltrado = somaTotal(filtrado)
    const seriePorAno = (porAno, campo) => anos.map((ano) => porAno.get(ano)?.[campo] ?? 0)
    return {
        labels: anos.map(String),
        saldoTradicional: anos.map((ano) => saldoDoAno(tradicional, ano)),
        saldoFiltrado: anos.map((ano) => saldoDoAno(filtrado, ano)),
        exportacaoTradicional: seriePorAno(tradicional, 'exportado'),
        importacaoTradicional: seriePorAno(tradicional, 'importado'),
        exportacaoFiltrada: seriePorAno(filtrado, 'exportado'),
        importacaoFiltrada: seriePorAno(filtrado, 'importado'),
        totais: {
            saldoTradicional: totalTradicional.exportado - totalTradicional.importado,
            saldoFiltrado: totalFiltrado.exportado - totalFiltrado.importado,
            exportadoFiltrado: totalFiltrado.exportado,
            importadoFiltrado: totalFiltrado.importado,
            exportadoTotal: totalTradicional.exportado,
            importadoTotal: totalTradicional.importado,
        },
    }
}
