import { ehExportacao, ehImportacao, grupoDoRegistro } from './aggregationsV2'

const somaPorAno = (registros) => {
    const porAno = new Map()
    for (const registro of registros) {
        const agregado = porAno.get(registro.ano) ?? { exportado: 0, importado: 0 }
        if (ehExportacao(registro)) agregado.exportado += Number(registro.fob_usd)
        if (ehImportacao(registro)) agregado.importado += Number(registro.fob_usd)
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

/**
 * Monta as séries e os totais da Balança Comercial.
 *
 * `registrosTotal` é a BASE TOTAL do período — todos os produtos do Piauí,
 * inclusive os de grupo 'Outros'. É sempre o denominador dos indicadores de
 * participação. `registrosRecorte` é o recorte TIC (Economia Digital), já
 * restrito ao grupo/produto escolhido no filtro, e alimenta os valores absolutos.
 */
export function montarBalanca(registrosTotal, registrosRecorte) {
    const total = somaPorAno(registrosTotal)
    const recorte = somaPorAno(registrosRecorte)
    const anos = [...new Set([...total.keys(), ...recorte.keys()])].sort((a, b) => a - b)
    const saldoDoAno = (porAno, ano) => {
        const agregado = porAno.get(ano)
        return agregado ? agregado.exportado - agregado.importado : 0
    }
    const somasTotal = somaTotal(total)
    const somasRecorte = somaTotal(recorte)
    const saldoRecorte = somasRecorte.exportado - somasRecorte.importado
    const movimentacaoRecorte = somasRecorte.exportado + somasRecorte.importado
    // Denominador dos indicadores de participação: SEMPRE a base total do Piauí
    const movimentacaoTotal = somasTotal.exportado + somasTotal.importado
    const participacao = (parte) => (movimentacaoTotal > 0 ? (parte / movimentacaoTotal) * 100 : 0)

    return {
        labels: anos.map(String),
        anos: anos.length > 0 ? { inicio: anos[0], fim: anos[anos.length - 1] } : null,
        saldoTradicional: anos.map((ano) => saldoDoAno(total, ano)),
        saldoRecorte: anos.map((ano) => saldoDoAno(recorte, ano)),
        totais: {
            exportadoTotal: somasTotal.exportado,
            importadoTotal: somasTotal.importado,
            saldoTotal: somasTotal.exportado - somasTotal.importado,
            exportadoRecorte: somasRecorte.exportado,
            importadoRecorte: somasRecorte.importado,
            saldoRecorte,
        },
        participacao: {
            // Recorte TIC sobre a base total (numerador TIC, denominador base completa)
            movimentacao: participacao(movimentacaoRecorte),
            exportacao: participacao(somasRecorte.exportado),
            importacao: participacao(somasRecorte.importado),
        },
        tendencia: {
            saldo: saldoRecorte,
            superavit: saldoRecorte >= 0,
            percentual: participacao(movimentacaoRecorte),
        },
    }
}

// Balde de SH4 sem correspondência em ncm_tic — não é um grupo de economia digital
const GRUPO_NAO_CLASSIFICADO = 'Outros'

/**
 * Blocos do treemap "(Grupo ou Produto)": um por grupo temático ou, quando já há um
 * grupo escolhido, um por produto. A área do bloco é o módulo do saldo; o campo
 * `saldo` mantém o sinal para o rótulo mostrar déficit como negativo.
 */
export function montarTreemapGrupoProduto(registros, { porProduto = false } = {}) {
    const porChave = new Map()
    for (const registro of registros) {
        const grupo = grupoDoRegistro(registro)
        // Ao listar grupos, o balde de não classificados abafaria todo o resto
        if (!porProduto && grupo === GRUPO_NAO_CLASSIFICADO) continue
        const chave = porProduto ? (registro.descricao_sh4 ?? String(registro.codigo_sh4)) : grupo
        const agregado = porChave.get(chave) ?? {
            nome: chave,
            grupo,
            codigo: porProduto ? String(registro.codigo_sh4).padStart(4, '0') : null,
            exportado: 0,
            importado: 0,
        }
        porChave.set(chave, agregado)
        if (ehExportacao(registro)) agregado.exportado += Number(registro.fob_usd)
        if (ehImportacao(registro)) agregado.importado += Number(registro.fob_usd)
    }

    const blocos = [...porChave.values()]
        .map((agregado) => {
            const saldo = agregado.exportado - agregado.importado
            return { ...agregado, saldo, valor: Math.abs(saldo) }
        })
        .filter((bloco) => bloco.valor > 0)
        // O squarify exige ordem decrescente de área
        .sort((primeiro, segundo) => segundo.valor - primeiro.valor)

    const totalAbsoluto = blocos.reduce((soma, bloco) => soma + bloco.valor, 0)
    return blocos.map((bloco) => ({
        ...bloco,
        percentual: totalAbsoluto > 0 ? (bloco.valor / totalAbsoluto) * 100 : 0,
    }))
}

/** Linhas do Catálogo de Produtos: um produto SH4 por fluxo. */
export function montarCatalogoProdutos(registros) {
    const porChave = new Map()
    for (const registro of registros) {
        const sh4 = String(registro.codigo_sh4).padStart(4, '0')
        const chave = `${sh4}|${registro.fluxo}`
        const linha = porChave.get(chave) ?? {
            id: chave,
            produto: registro.descricao_sh4 ?? sh4,
            categoria: grupoDoRegistro(registro),
            fluxo: registro.fluxo,
            sh4,
            fob: 0,
            kg: 0,
        }
        porChave.set(chave, linha)
        linha.fob += Number(registro.fob_usd)
        linha.kg += Number(registro.kg_liquido)
    }

    return [...porChave.values()]
        .map((linha) => ({ ...linha, toneladas: linha.kg / 1000 }))
        .sort((primeira, segunda) => segunda.fob - primeira.fob)
}
