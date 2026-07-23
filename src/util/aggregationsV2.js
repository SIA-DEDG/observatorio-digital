import { from as tabelaDe, desc, op } from 'arquero'
import { supabase } from '../lib/supabase'
import { normKey } from './aggregations'
import { territorioDoMunicipio } from './territoriosPI'

const PAGINA = 1000
const SUFIXO_UF = /\s*-\s*[A-Z]{2}$/

async function buscarTudo(tabela, colunas) {
    if (!supabase) return []
    const linhas = []
    for (let inicio = 0; ; inicio += PAGINA) {
        const { data, error } = await supabase.from(tabela).select(colunas).range(inicio, inicio + PAGINA - 1)
        if (error) throw error
        linhas.push(...data)
        if (data.length < PAGINA) break
    }
    return linhas
}

const CHAVE_CACHE_LOCAL = 'observatorio:geral_municipios:v4'
const VALIDADE_CACHE_MS = 60 * 60 * 1000

let cacheEmMemoria = null

function lerCacheLocal() {
    try {
        const conteudoBruto = localStorage.getItem(CHAVE_CACHE_LOCAL)
        if (!conteudoBruto) return null
        const { quando, registros } = JSON.parse(conteudoBruto)
        if (Date.now() - quando > VALIDADE_CACHE_MS) return null
        return registros
    } catch {
        return null
    }
}

function salvarCacheLocal(registros) {
    try {
        localStorage.setItem(CHAVE_CACHE_LOCAL, JSON.stringify({ quando: Date.now(), registros }))
    } catch {
    }
}

function valorMaisFrequentePorSh4(linhas, extrairCodigo, extrairValor) {
    const contagem = new Map()
    for (const linha of linhas) {
        const valor = extrairValor(linha)
        if (!valor) continue
        const sh4 = String(extrairCodigo(linha)).replace(/\D/g, '').padStart(8, '0').slice(0, 4)
        const porValor = contagem.get(sh4) ?? new Map()
        contagem.set(sh4, porValor)
        porValor.set(valor, (porValor.get(valor) ?? 0) + 1)
    }
    const resultado = {}
    for (const [sh4, porValor] of contagem) {
        let maisFrequente = null
        let maiorContagem = 0
        for (const [valor, vezes] of porValor) if (vezes > maiorContagem) { maiorContagem = vezes; maisFrequente = valor }
        resultado[sh4] = maisFrequente
    }
    return resultado
}

export async function carregarDatasetV2() {
    if (cacheEmMemoria) return cacheEmMemoria

    const registrosDoCache = lerCacheLocal()
    if (registrosDoCache) {
        cacheEmMemoria = registrosDoCache
        return registrosDoCache
    }

    const [registros, ncmTic, ncmSetores] = await Promise.all([
        buscarTudo('geral_municipios', 'fluxo,ano,mes,municipio,pais,bloco_economico,codigo_sh4,descricao_sh4,fob_usd,kg_liquido'),
        buscarTudo('ncm_tic', 'codigo_limpo,grupo'),
        buscarTudo('geral_ncm', 'codigo_ncm,setor_economico'),
    ])
    const grupoPorSh4 = valorMaisFrequentePorSh4(ncmTic, (linha) => linha.codigo_limpo, (linha) => linha.grupo)
    const setorPorSh4 = valorMaisFrequentePorSh4(ncmSetores, (linha) => linha.codigo_ncm, (linha) => linha.setor_economico)
    const registrosLimpos = registros.map((registro) => {
        const sh4 = String(registro.codigo_sh4).padStart(4, '0')
        return {
            ...registro,
            municipio: registro.municipio.replace(SUFIXO_UF, ''),
            setor: setorPorSh4[sh4] ?? 'Não classificado',
            grupo: grupoPorSh4[sh4] ?? 'Outros',
        }
    })
    cacheEmMemoria = registrosLimpos
    salvarCacheLocal(registrosLimpos)
    return registrosLimpos
}

export const ehExportacao = (registro) => registro.fluxo === 'Exportacao'
export const ehImportacao = (registro) => registro.fluxo === 'Importacao'
const anoMes = (registro) => `${registro.ano}-${String(registro.mes).padStart(2, '0')}`
export const setorDoRegistro = (registro) => registro.setor ?? 'Outros'
export const grupoDoRegistro = (registro) => registro.grupo ?? 'Outros'

export const FILTROS_INICIAIS_V2 = { fluxo: [], pais: [], setor: [], grupo: [], produtos: [], inicio: '', fim: '' }

const ROTULO_FLUXO = { Exportacao: 'Exportação', Importacao: 'Importação' }

export function opcoesFiltrosV2(registros) {
    const fluxos = new Set()
    const paises = new Set()
    const municipios = new Set()
    const setores = new Set()
    const setorPorGrupo = new Map()
    const produtos = new Map()
    for (const registro of registros) {
        fluxos.add(registro.fluxo)
        paises.add(registro.pais)
        municipios.add(registro.municipio)
        setores.add(setorDoRegistro(registro))
        if (!setorPorGrupo.has(grupoDoRegistro(registro))) setorPorGrupo.set(grupoDoRegistro(registro), setorDoRegistro(registro))
        if (!produtos.has(registro.codigo_sh4)) {
            produtos.set(registro.codigo_sh4, {
                label: registro.descricao_sh4 ?? registro.codigo_sh4,
                setor: setorDoRegistro(registro),
                grupo: grupoDoRegistro(registro),
            })
        }
    }
    const ordenar = (conjunto) => [...conjunto].sort()
    return {
        fluxo: ordenar(fluxos).map((valor) => ({ value: valor, label: ROTULO_FLUXO[valor] ?? valor })),
        pais: ordenar(paises).map((valor) => ({ value: valor, label: valor })),
        municipio: ordenar(municipios).map((valor) => ({ value: valor, label: valor })),
        setor: ordenar(setores).map((valor) => ({ value: valor, label: valor })),
        grupo: [...setorPorGrupo.entries()]
            .sort(([grupoA], [grupoB]) => grupoA.localeCompare(grupoB))
            .map(([grupo, setor]) => ({ value: grupo, label: grupo, setor })),
        produtos: [...produtos]
            .map(([value, produto]) => ({ value, ...produto }))
            .sort((a, b) => a.label.localeCompare(b.label)),
    }
}

export function filtrarOpcoesProduto(opcoesProduto, setores, grupos) {
    if (!setores?.length && !grupos?.length) return opcoesProduto
    return opcoesProduto.filter((opcao) => setores?.includes(opcao.setor) || grupos?.includes(opcao.grupo))
}

export function aplicarFiltrosV2(registros, filtros) {
    const inicio = filtros.inicio ? filtros.inicio.slice(0, 7) : null
    const fim = filtros.fim ? filtros.fim.slice(0, 7) : null
    return registros.filter((registro) => {
        if (filtros.fluxo.length && !filtros.fluxo.includes(registro.fluxo)) return false
        if (filtros.pais.length && !filtros.pais.includes(registro.pais)) return false
        if (filtros.setor.length || filtros.grupo?.length) {
            const casaSetor = filtros.setor.includes(setorDoRegistro(registro))
            const casaGrupo = filtros.grupo?.includes(grupoDoRegistro(registro))
            if (!casaSetor && !casaGrupo) return false
        }
        if (filtros.produtos.length && !filtros.produtos.includes(registro.codigo_sh4)) return false
        const competencia = anoMes(registro)
        if (inicio && competencia < inicio) return false
        if (fim && competencia > fim) return false
        return true
    })
}

export function filtrarPorEscopo(registros, territorios, municipios) {
    if (municipios?.length) {
        const selecionados = new Set(municipios.map(normKey))
        return registros.filter((registro) => selecionados.has(normKey(registro.municipio)))
    }
    if (territorios?.length) {
        const selecionados = new Set(territorios)
        return registros.filter((registro) => selecionados.has(territorioDoMunicipio(registro.municipio)))
    }
    return registros
}

export function montarDadosMapaV2(registros) {
    const porMunicipio = {}
    for (const registro of registros) {
        const chave = normKey(registro.municipio)
        const agregado = porMunicipio[chave] ??= {
            nome: registro.municipio,
            exportado: 0,
            importado: 0,
            _produtosExp: new Map(),
            _produtosImp: new Map(),
        }
        const valor = Number(registro.fob_usd)
        const produto = registro.descricao_sh4 ?? registro.codigo_sh4
        if (ehExportacao(registro)) {
            agregado.exportado += valor
            agregado._produtosExp.set(produto, (agregado._produtosExp.get(produto) ?? 0) + valor)
        } else if (ehImportacao(registro)) {
            agregado.importado += valor
            agregado._produtosImp.set(produto, (agregado._produtosImp.get(produto) ?? 0) + valor)
        }
    }
    const top3 = (mapa) => [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([nome]) => nome)
    for (const agregado of Object.values(porMunicipio)) {
        agregado.topExportados = top3(agregado._produtosExp)
        agregado.topImportados = top3(agregado._produtosImp)
        delete agregado._produtosExp
        delete agregado._produtosImp
    }
    return porMunicipio
}

export function montarHistoricoAnual(registrosDoEscopo, { territorios, municipios }) {
    const anos = [...new Set(registrosDoEscopo.map((registro) => registro.ano))].sort()
    const labels = anos.map(String)
    const indicePorAno = new Map(anos.map((ano, indice) => [ano, indice]))

    const novaSerie = (nome) => ({ name: nome, exports: anos.map(() => 0), imports: anos.map(() => 0) })
    const series = new Map()
    const porMunicipio = municipios?.length > 0
    const porTerritorio = !porMunicipio && territorios?.length > 0

    for (const registro of registrosDoEscopo) {
        const nomeSerie = porMunicipio ? registro.municipio
            : porTerritorio ? (territorioDoMunicipio(registro.municipio) ?? 'Sem território')
            : 'Estado do Piauí'
        const serie = series.get(nomeSerie) ?? novaSerie(nomeSerie)
        series.set(nomeSerie, serie)
        const indice = indicePorAno.get(registro.ano)
        if (ehExportacao(registro)) serie.exports[indice] += Number(registro.fob_usd)
        if (ehImportacao(registro)) serie.imports[indice] += Number(registro.fob_usd)
    }
    return { labels, cities: [...series.values()] }
}

const linhasParaDataframe = (registros) =>
    registros.map((registro) => ({
        setor: setorDoRegistro(registro),
        grupo: grupoDoRegistro(registro),
        codigo_sh4: registro.codigo_sh4,
        produto: registro.descricao_sh4 ?? registro.codigo_sh4,
        pais: registro.pais,
        municipio: registro.municipio,
        exportado: ehExportacao(registro) ? Number(registro.fob_usd) : 0,
        importado: ehImportacao(registro) ? Number(registro.fob_usd) : 0,
    }))

export function montarSetores(registrosDoEscopo, limiteProdutos = 15) {
    if (registrosDoEscopo.length === 0) return []
    const produtosPorGrupo = tabelaDe(linhasParaDataframe(registrosDoEscopo))
        .groupby('setor', 'grupo', 'codigo_sh4', 'produto')
        .rollup({
            exportado: (d) => op.sum(d.exportado),
            importado: (d) => op.sum(d.importado),
        })
        .derive({ total: (d) => d.exportado + d.importado })
        .orderby(desc('total'))
        .objects()

    const setores = new Map()
    for (const linha of produtosPorGrupo) {
        const setor = setores.get(linha.setor) ?? { nome: linha.setor, total: 0, produtos: [] }
        setores.set(linha.setor, setor)
        setor.total += linha.total
        if (setor.produtos.length < limiteProdutos) {
            setor.produtos.push({ grupo: linha.grupo, descricao: linha.produto, exportado: linha.exportado, importado: linha.importado })
        }
    }
    return [...setores.values()].sort((a, b) => b.total - a.total)
}

export function montarPaisesPorFluxo(registrosDoEscopo, limiteLinhas = 15) {
    const vazio = { exportacao: [], importacao: [] }
    if (registrosDoEscopo.length === 0) return vazio

    const agrupar = (expressaoValor) =>
        tabelaDe(linhasParaDataframe(registrosDoEscopo))
            .groupby('pais', 'municipio', 'produto')
            .rollup({ valor: expressaoValor })
            .filter((d) => d.valor > 0)
            .orderby(desc('valor'))
            .slice(0, limiteLinhas)
            .objects()

    return {
        exportacao: agrupar((d) => op.sum(d.exportado)),
        importacao: agrupar((d) => op.sum(d.importado)),
    }
}

export function montarStatsCardV2(registrosDoEscopo) {
    const produtos = new Set()
    const paises = new Set()
    let exportado = 0
    let importado = 0
    let qtdExportadaKg = 0
    let qtdImportadaKg = 0
    for (const registro of registrosDoEscopo) {
        produtos.add(registro.codigo_sh4)
        paises.add(registro.pais)
        if (ehExportacao(registro)) {
            exportado += Number(registro.fob_usd)
            qtdExportadaKg += Number(registro.kg_liquido)
        }
        if (ehImportacao(registro)) {
            importado += Number(registro.fob_usd)
            qtdImportadaKg += Number(registro.kg_liquido)
        }
    }
    return {
        produtos: produtos.size,
        paises: paises.size,
        exportado,
        importado,
        qtdExportadaToneladas: qtdExportadaKg / 1000,
        qtdImportadaToneladas: qtdImportadaKg / 1000,
    }
}
