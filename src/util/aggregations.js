import { supabase } from '../lib/supabase'
import { territorioDoMunicipio } from './territoriosPI'

const PAGE = 1000

async function fetchAll(table, columns) {
    if (!supabase) return []
    const rows = []
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1)
        if (error) throw error
        rows.push(...data)
        if (data.length < PAGE) break
    }
    return rows
}

async function fetchMesoRegioes() {
    try {
        const municipios = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/22/municipios').then((r) => r.json())
        return new Map(municipios.map((m) => [normKey(m.nome), m.microrregiao?.mesorregiao?.nome ?? 'Sem região']))
    } catch {
        return new Map()
    }
}

let datasetCache = null

export async function loadDataset() {
    if (datasetCache) return datasetCache
    const [records, municipios, balanca, ncmTic, mesoMap] = await Promise.all([
        fetchAll('geral_ncm', 'fluxo,ano,mes,codigo_ncm,descricao_ncm,pais,bloco_economico,fob_usd,kg_liquido,cif_usd'),
        fetchAll('geral_municipios', 'fluxo,ano,mes,municipio,pais,bloco_economico,codigo_sh4,descricao_sh4,fob_usd,kg_liquido'),
        fetchAll('balanca_brasil', 'ano,mes,exportacao_fob,importacao_fob'),
        fetchAll('ncm_tic', 'codigo_limpo,grupo'),
        fetchMesoRegioes(),
    ])
    const ncmGrupo = new Map(ncmTic.filter((r) => r.grupo).map((r) => [r.codigo_limpo, r.grupo]))
    datasetCache = { records, municipios, balanca, ncmGrupo, mesoMap }
    return datasetCache
}

export const normKey = (nome) => (nome ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/).filter(Boolean).sort().join(' ')

const MUNI_SUFFIX = /\s*-\s*[A-Z]{2}$/

export function selectRecords(dataset, nivel) {
    if (!dataset) return []
    if (nivel !== 'piaui') return dataset.records
    return (dataset.municipios ?? []).map((row) => {
        const nomeMunicipio = row.municipio.replace(MUNI_SUFFIX, '')
        return {
            fluxo: row.fluxo,
            ano: row.ano,
            mes: row.mes,
            pais: nomeMunicipio,
            bloco_economico: dataset.mesoMap?.get(normKey(nomeMunicipio)) ?? 'Sem região',
            codigo_ncm: row.codigo_sh4,
            descricao_ncm: row.descricao_sh4,
            fob_usd: row.fob_usd,
            kg_liquido: row.kg_liquido,
            cif_usd: 0,
        }
    })
}

const yearMonth = (ano, mes) => `${ano}-${String(mes).padStart(2, '0')}`
const isExport = (row) => row.fluxo === 'Exportacao'
const isImport = (row) => row.fluxo === 'Importacao'

function buildProdutoMatchers(dataset, filters) {
    const produtoNcm = filters.produtos.length ? new Set(filters.produtos) : null
    const produtoSh4 = produtoNcm ? new Set(filters.produtos.map((c) => String(c).slice(0, 4))) : null
    const categoriaNcm = filters.categoria.length
        ? new Set([...dataset.ncmGrupo].filter(([, grupo]) => filters.categoria.includes(grupo)).map(([codigo]) => codigo))
        : null
    const categoriaSh4 = categoriaNcm ? new Set([...categoriaNcm].map((c) => String(c).slice(0, 4))) : null
    return { produtoNcm, produtoSh4, categoriaNcm, categoriaSh4 }
}

const matchCodigo = (codigo, setNcm, setSh4) => {
    if (!setNcm) return true
    const texto = String(codigo ?? '')
    return texto.length <= 4 ? setSh4.has(texto) : setNcm.has(texto)
}

export function applyFilters(dataset, filters) {
    const matchers = buildProdutoMatchers(dataset, filters)
    const inicio = filters.inicio ? filters.inicio.slice(0, 7) : null
    const fim = filters.fim ? filters.fim.slice(0, 7) : null

    return dataset.records.filter((row) => {
        if (filters.fluxo.length && !filters.fluxo.includes(row.fluxo)) return false
        if (filters.pais.length && !filters.pais.includes(row.pais)) return false
        if (filters.bloco.length && !filters.bloco.includes(row.bloco_economico)) return false
        if (!matchCodigo(row.codigo_ncm, matchers.produtoNcm, matchers.produtoSh4)) return false
        if (!matchCodigo(row.codigo_ncm, matchers.categoriaNcm, matchers.categoriaSh4)) return false
        const competencia = yearMonth(row.ano, row.mes)
        if (inicio && competencia < inicio) return false
        if (fim && competencia > fim) return false
        return true
    })
}

const valorMaisFrequente = (valores) => {
    const contagem = new Map()
    for (const valor of valores) if (valor != null) contagem.set(valor, (contagem.get(valor) ?? 0) + 1)
    let maisFrequente = null, maiorContagem = 0
    for (const [valor, vezes] of contagem) if (vezes > maiorContagem) { maiorContagem = vezes; maisFrequente = valor }
    return maisFrequente
}

export function summaryByCountry(records) {
    const porPais = new Map()
    for (const row of records) {
        let agregado = porPais.get(row.pais)
        if (!agregado) {
            agregado = { pais: row.pais, blocos: [], exportado: 0, importado: 0, qtd_exportacao: 0, qtd_importacao: 0 }
            porPais.set(row.pais, agregado)
        }
        agregado.blocos.push(row.bloco_economico)
        if (isExport(row)) { agregado.exportado += Number(row.fob_usd); agregado.qtd_exportacao += Number(row.kg_liquido) }
        if (isImport(row)) { agregado.importado += Number(row.fob_usd); agregado.qtd_importacao += Number(row.kg_liquido) }
    }
    return [...porPais.values()]
        .map(({ blocos, ...resto }) => ({ ...resto, blocos_economicos: valorMaisFrequente(blocos) }))
        .sort((a, b) => b.exportado - a.exportado)
}

export function cardsTotals(records) {
    const totais = { produtos: 0, exportado_fob: 0, importado_fob: 0, importado_cif: 0, qtd_exportacao: 0, qtd_importacao: 0 }
    const ncms = new Set()
    for (const row of records) {
        ncms.add(row.codigo_ncm)
        if (isExport(row)) { totais.exportado_fob += Number(row.fob_usd); totais.qtd_exportacao += Number(row.kg_liquido) }
        if (isImport(row)) {
            totais.importado_fob += Number(row.fob_usd)
            totais.importado_cif += Number(row.cif_usd)
            totais.qtd_importacao += Number(row.kg_liquido)
        }
    }
    totais.produtos = ncms.size
    totais.saldo = totais.exportado_fob - totais.importado_fob
    return totais
}

export function filterOptions(dataset) {
    const distintos = (chave) => [...new Set(dataset.records.map((r) => r[chave]).filter(Boolean))].sort()
    const produtos = new Map()
    for (const row of dataset.records) if (!produtos.has(row.codigo_ncm)) produtos.set(row.codigo_ncm, row.descricao_ncm)
    const municipios = [...new Set((dataset.municipios ?? []).map((r) => r.municipio.replace(MUNI_SUFFIX, '')))].sort()
    const regioes = [...new Set([...(dataset.mesoMap?.values() ?? [])])].sort()
    return {
        nivel: [],
        fluxo: distintos('fluxo').map((v) => ({ value: v, label: v })),
        bloco: distintos('bloco_economico').map((v) => ({ value: v, label: v })),
        regiao: regioes.map((v) => ({ value: v, label: v })),
        pais: distintos('pais').map((v) => ({ value: v, label: v })),
        municipio: municipios.map((v) => ({ value: v, label: v })),
        categoria: [...new Set([...dataset.ncmGrupo.values()])].sort().map((v) => ({ value: v, label: v })),
        produtos: [...produtos].map(([value, label]) => ({ value, label: label ?? value })).sort((a, b) => a.label.localeCompare(b.label)),
    }
}

export function summaryByMunicipio(dataset, filters) {
    const municipioMode = filters.nivel === 'piaui'
    const matchers = buildProdutoMatchers(dataset, filters)
    const inicio = filters.inicio ? filters.inicio.slice(0, 7) : null
    const fim = filters.fim ? filters.fim.slice(0, 7) : null
    const porMunicipio = new Map()
    for (const row of dataset.municipios ?? []) {
        if (filters.fluxo.length && !filters.fluxo.includes(row.fluxo)) continue
        if (!matchCodigo(row.codigo_sh4, matchers.produtoNcm, matchers.produtoSh4)) continue
        if (!matchCodigo(row.codigo_sh4, matchers.categoriaNcm, matchers.categoriaSh4)) continue
        const nomeMunicipio = row.municipio.replace(MUNI_SUFFIX, '')
        if (municipioMode) {
            if (filters.pais.length && !filters.pais.includes(nomeMunicipio)) continue
            const regiao = dataset.mesoMap?.get(normKey(nomeMunicipio)) ?? 'Sem região'
            if (filters.bloco.length && !filters.bloco.includes(regiao)) continue
        } else {
            if (filters.pais.length && !filters.pais.includes(row.pais)) continue
            if (filters.bloco.length && !filters.bloco.includes(row.bloco_economico)) continue
        }
        const competencia = yearMonth(row.ano, row.mes)
        if (inicio && competencia < inicio) continue
        if (fim && competencia > fim) continue
        const chave = normKey(nomeMunicipio)
        const agregado = porMunicipio.get(chave) ?? { nome: nomeMunicipio, exportado: 0, importado: 0 }
        if (isExport(row)) agregado.exportado += Number(row.fob_usd)
        if (isImport(row)) agregado.importado += Number(row.fob_usd)
        porMunicipio.set(chave, agregado)
    }
    return Object.fromEntries(porMunicipio)
}

export function buildMunicipioComparison(dataset, filters, limite = 5, territorios = null) {
    const municipioMode = filters.nivel === 'piaui'
    const matchers = buildProdutoMatchers(dataset, filters)
    const inicio = filters.inicio ? filters.inicio.slice(0, 7) : null
    const fim = filters.fim ? filters.fim.slice(0, 7) : null
    const porMunicipio = new Map()
    for (const row of dataset.municipios ?? []) {
        if (filters.fluxo.length && !filters.fluxo.includes(row.fluxo)) continue
        if (!matchCodigo(row.codigo_sh4, matchers.produtoNcm, matchers.produtoSh4)) continue
        if (!matchCodigo(row.codigo_sh4, matchers.categoriaNcm, matchers.categoriaSh4)) continue
        const nome = row.municipio.replace(MUNI_SUFFIX, '')
        if (territorios?.length && !territorios.includes(territorioDoMunicipio(nome))) continue
        if (municipioMode) {
            if (filters.pais.length && !filters.pais.includes(nome)) continue
            const regiao = dataset.mesoMap?.get(normKey(nome)) ?? 'Sem região'
            if (filters.bloco.length && !filters.bloco.includes(regiao)) continue
        } else {
            if (filters.pais.length && !filters.pais.includes(row.pais)) continue
            if (filters.bloco.length && !filters.bloco.includes(row.bloco_economico)) continue
        }
        const competencia = yearMonth(row.ano, row.mes)
        if (inicio && competencia < inicio) continue
        if (fim && competencia > fim) continue
        const agregado = porMunicipio.get(nome) ?? { nome, exportado: 0, importado: 0 }
        if (isExport(row)) agregado.exportado += Number(row.fob_usd)
        if (isImport(row)) agregado.importado += Number(row.fob_usd)
        porMunicipio.set(nome, agregado)
    }
    const lista = [...porMunicipio.values()].sort((a, b) => (b.exportado + b.importado) - (a.exportado + a.importado))
    const temSelecao = municipioMode && filters.pais.length > 0
    return temSelecao ? lista : lista.slice(0, limite)
}

export function buildMapData(dataset, rowsByCountry, cards, filters) {
    const byCountry = Object.fromEntries(
        rowsByCountry.map((r) => [normKey(r.pais), { exportado: r.exportado, importado: r.importado }]),
    )

    const inicio = filters.inicio ? filters.inicio.slice(0, 7) : null
    const fim = filters.fim ? filters.fim.slice(0, 7) : null
    let brasilExp = 0, brasilImp = 0
    for (const row of dataset.balanca ?? []) {
        const competencia = yearMonth(row.ano, row.mes)
        if (inicio && competencia < inicio) continue
        if (fim && competencia > fim) continue
        brasilExp += Number(row.exportacao_fob)
        brasilImp += Number(row.importacao_fob)
    }
    byCountry[normKey('Brasil')] = { exportado: brasilExp, importado: brasilImp, nota: 'Total nacional do Brasil' }
    const byState = cards ? { [normKey('Piauí')]: { exportado: cards.exportado_fob, importado: cards.importado_fob } } : {}
    const byMunicipio = summaryByMunicipio(dataset, filters)
    return { byCountry, byState, byMunicipio }
}

export function buildProductRanking(filteredRecords, filters) {
    const semPais = filters.pais.length === 0
    const grupos = new Map()
    for (const row of filteredRecords) {
        const city = semPais ? 'Brasil' : row.pais
        let grupo = grupos.get(city)
        if (!grupo) { grupo = { exports: new Map(), imports: new Map() }; grupos.set(city, grupo) }
        const produtosDoFluxo = isExport(row) ? grupo.exports : isImport(row) ? grupo.imports : null
        if (!produtosDoFluxo) continue
        const nome = row.descricao_ncm ?? row.codigo_ncm
        const agregado = produtosDoFluxo.get(nome) ?? { name: nome, value: 0, quantity: 0 }
        agregado.value += Number(row.fob_usd)
        agregado.quantity += Number(row.kg_liquido)
        produtosDoFluxo.set(nome, agregado)
    }
    const paraLista = (mapa) => [...mapa.values()].map((produto) => ({ name: produto.name, value: produto.value, quantity: produto.quantity }))
    const cities = [...grupos.entries()].map(([name, grupo]) => ({ name, exports: paraLista(grupo.exports), imports: paraLista(grupo.imports) }))
    if (!semPais) {
        const ordem = filters.pais.slice(0, 5)
        cities.sort((a, b) => ordem.indexOf(a.name) - ordem.indexOf(b.name))
    }
    return cities
}

const FLOW_LABEL = { Exportacao: 'EXPORTAÇÃO', Importacao: 'IMPORTAÇÃO' }

export function buildCatalog(dataset, filteredRecords, limite = 200) {
    const sh4Desc = new Map()
    const valoresPorMunicipio = new Map()
    for (const row of dataset.municipios ?? []) {
        if (row.descricao_sh4 && !sh4Desc.has(row.codigo_sh4)) sh4Desc.set(row.codigo_sh4, row.descricao_sh4)
        const chave = `${row.codigo_sh4}|${row.fluxo}`
        let valoresDoProduto = valoresPorMunicipio.get(chave)
        if (!valoresDoProduto) { valoresDoProduto = new Map(); valoresPorMunicipio.set(chave, valoresDoProduto) }
        const nome = row.municipio.replace(/\s*-\s*[A-Z]{2}$/, '')
        valoresDoProduto.set(nome, (valoresDoProduto.get(nome) ?? 0) + Number(row.fob_usd))
    }
    const chaveComMaiorValor = (mapa) => {
        let maiorChave = null, maiorValor = -1
        for (const [chave, valor] of mapa) if (valor > maiorValor) { maiorValor = valor; maiorChave = chave }
        return maiorChave
    }

    const grupos = new Map()
    for (const row of filteredRecords) {
        const chave = `${row.codigo_ncm}|${row.fluxo}`
        let grupo = grupos.get(chave)
        if (!grupo) {
            grupo = { ncm: row.codigo_ncm, desc: row.descricao_ncm, fluxo: row.fluxo, fob: 0, cif: 0, kg: 0, porPais: new Map() }
            grupos.set(chave, grupo)
        }
        grupo.fob += Number(row.fob_usd)
        grupo.cif += Number(row.cif_usd)
        grupo.kg += Number(row.kg_liquido)
        grupo.porPais.set(row.pais, (grupo.porPais.get(row.pais) ?? 0) + Number(row.fob_usd))
    }

    const rows = [...grupos.values()].map((grupo) => {
        const sh4 = (grupo.ncm ?? '').slice(0, 4)
        return {
            product: grupo.desc ?? grupo.ncm,
            category: dataset.ncmGrupo.get(grupo.ncm) ?? '—',
            flow: FLOW_LABEL[grupo.fluxo] ?? grupo.fluxo,
            sh4,
            sh4Desc: sh4Desc.get(sh4) ?? '',
            ncm: grupo.ncm,
            ncmDesc: grupo.desc ?? '',
            fobValue: grupo.fob,
            cifValue: grupo.fluxo === 'Importacao' ? grupo.cif : null,
            weight: grupo.kg,
            quantity: grupo.kg,
            mainCountry: chaveComMaiorValor(grupo.porPais) ?? '—',
            mainCity: chaveComMaiorValor(valoresPorMunicipio.get(`${sh4}|${grupo.fluxo}`) ?? new Map()) ?? '—',
        }
    })
    rows.sort((a, b) => b.fobValue - a.fobValue)
    return rows.slice(0, limite)
}

export function buildLineChart(dataset, filteredRecords, filters, territorios = null) {
    if (filters.nivel === 'piaui' && (territorios?.length || filters.pais.length > 0)) {
        const porMunicipio = filters.pais.length > 0
        const anosSet = new Set()
        const series = new Map()
        for (const row of filteredRecords) {
            anosSet.add(row.ano)
            const nomeSerie = porMunicipio ? row.pais : (territorioDoMunicipio(row.pais) ?? 'Sem território')
            let serie = series.get(nomeSerie)
            if (!serie) { serie = { porAno: new Map() }; series.set(nomeSerie, serie) }
            const agregado = serie.porAno.get(row.ano) ?? { exp: 0, imp: 0 }
            if (isExport(row)) agregado.exp += Number(row.fob_usd)
            if (isImport(row)) agregado.imp += Number(row.fob_usd)
            serie.porAno.set(row.ano, agregado)
        }
        const anos = [...anosSet].sort((a, b) => a - b)
        return {
            labels: anos.map(String),
            cities: [...series.entries()].map(([name, serie]) => ({
                name,
                exports: anos.map((ano) => serie.porAno.get(ano)?.exp ?? 0),
                imports: anos.map((ano) => serie.porAno.get(ano)?.imp ?? 0),
            })),
        }
    }

    if (filters.nivel === 'piaui') {
        const inicio = filters.inicio ? filters.inicio.slice(0, 7) : null
        const fim = filters.fim ? filters.fim.slice(0, 7) : null
        const porAno = new Map()
        for (const row of dataset.records ?? []) {
            const competencia = yearMonth(row.ano, row.mes)
            if (inicio && competencia < inicio) continue
            if (fim && competencia > fim) continue
            const agregado = porAno.get(row.ano) ?? { exp: 0, imp: 0 }
            if (isExport(row)) agregado.exp += Number(row.fob_usd)
            if (isImport(row)) agregado.imp += Number(row.fob_usd)
            porAno.set(row.ano, agregado)
        }
        const anos = [...porAno.keys()].sort((a, b) => a - b)
        return {
            labels: anos.map(String),
            cities: [{
                name: 'Piauí',
                exports: anos.map((a) => porAno.get(a).exp),
                imports: anos.map((a) => porAno.get(a).imp),
            }],
        }
    }

    if (filters.pais.length === 0) {
        const inicio = filters.inicio ? filters.inicio.slice(0, 7) : null
        const fim = filters.fim ? filters.fim.slice(0, 7) : null
        const porAno = new Map()
        for (const row of dataset.balanca) {
            const competencia = yearMonth(row.ano, row.mes)
            if (inicio && competencia < inicio) continue
            if (fim && competencia > fim) continue
            const agregado = porAno.get(row.ano) ?? { exp: 0, imp: 0 }
            agregado.exp += Number(row.exportacao_fob)
            agregado.imp += Number(row.importacao_fob)
            porAno.set(row.ano, agregado)
        }
        const anos = [...porAno.keys()].sort((a, b) => a - b)
        return {
            labels: anos.map(String),
            cities: [{
                name: 'Brasil',
                exports: anos.map((a) => porAno.get(a).exp),
                imports: anos.map((a) => porAno.get(a).imp),
            }],
        }
    }

    const porPaisAno = new Map()
    const anosSet = new Set()
    for (const row of filteredRecords) {
        anosSet.add(row.ano)
        const chave = `${row.pais}|${row.ano}`
        const agregado = porPaisAno.get(chave) ?? { exp: 0, imp: 0 }
        if (isExport(row)) agregado.exp += Number(row.fob_usd)
        if (isImport(row)) agregado.imp += Number(row.fob_usd)
        porPaisAno.set(chave, agregado)
    }
    const anos = [...anosSet].sort((a, b) => a - b)
    const paises = filters.pais.slice(0, 5)
    return {
        labels: anos.map(String),
        cities: paises.map((pais) => ({
            name: pais,
            exports: anos.map((a) => (porPaisAno.get(`${pais}|${a}`)?.exp ?? 0)),
            imports: anos.map((a) => (porPaisAno.get(`${pais}|${a}`)?.imp ?? 0)),
        })),
    }
}
