import { from as tabelaDe, desc, op } from 'arquero'
import { supabase } from '../lib/supabase'
import { normKey } from './aggregations'
import { territorioDoMunicipio } from './territoriosPI'

const PAGINA = 1000
const SUFIXO_UF = /\s*-\s*[A-Z]{2}$/

/*
 * O PostgREST devolve no máximo 1000 linhas por request, então as tabelas
 * grandes vêm paginadas. A primeira página já traz o total (count=exact) e as
 * demais saem todas juntas: em série eram ~37 idas e voltas de 400 ms
 * esperando uma pela outra, ~9 s só de latência.
 */
async function buscarTudo(tabela, colunas) {
    if (!supabase) return []

    const { data, error, count } = await supabase
        .from(tabela)
        .select(colunas, { count: 'exact' })
        .range(0, PAGINA - 1)
    if (error) throw error
    if (count == null || count <= PAGINA) return data

    const respostas = await Promise.all(
        Array.from({ length: Math.ceil(count / PAGINA) - 1 }, (_, indice) => {
            const inicio = (indice + 1) * PAGINA
            return supabase.from(tabela).select(colunas).range(inicio, inicio + PAGINA - 1)
        }),
    )

    const linhas = [...data]
    for (const resposta of respostas) {
        if (resposta.error) throw resposta.error
        linhas.push(...resposta.data)
    }
    return linhas
}

// v5: o payload passou a levar o catálogo NCM junto dos registros
const CHAVE_CACHE_LOCAL = 'observatorio:geral_municipios:v5'
const VALIDADE_CACHE_MS = 60 * 60 * 1000

let cacheEmMemoria = null
let cacheBalancaBrasil = null

function lerCacheLocal() {
    try {
        const conteudoBruto = localStorage.getItem(CHAVE_CACHE_LOCAL)
        if (!conteudoBruto) return null
        const { quando, registros, ncms } = JSON.parse(conteudoBruto)
        if (Date.now() - quando > VALIDADE_CACHE_MS) return null
        return { registros, ncms }
    } catch {
        return null
    }
}

function salvarCacheLocal({ registros, ncms }) {
    try {
        localStorage.setItem(CHAVE_CACHE_LOCAL, JSON.stringify({ quando: Date.now(), registros, ncms }))
    } catch {
    }
}

/**
 * Normaliza um NCM para 8 dígitos.
 *
 * Em `ncm_tic` o código vem pontuado (DDDD.DD.DD). A pontuação diz a posição de
 * cada dígito, então um código pontuado incompleto ("8541.21") completa à
 * DIREITA — 85412100. Já um código sem pontuação e curto é zero à esquerda
 * perdido na importação numérica (1012100 → 01012100), e completa à esquerda.
 */
const normalizarNcm = (codigo) => {
    const texto = String(codigo).trim()
    const digitos = texto.replace(/\D/g, '')
    if (digitos.length >= 8) return digitos.slice(0, 8)
    return texto.includes('.') ? digitos.padEnd(8, '0') : digitos.padStart(8, '0')
}

function valorMaisFrequentePorSh4(linhas, extrairCodigo, extrairValor) {
    const contagem = new Map()
    for (const linha of linhas) {
        const valor = extrairValor(linha)
        if (!valor) continue
        const sh4 = normalizarNcm(extrairCodigo(linha)).slice(0, 4)
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

/** Devolve o NCM no formato de leitura da fonte: 85412100 → 8541.21.00 */
export const formatarNcm = (ncm) => `${ncm.slice(0, 4)}.${ncm.slice(4, 6)}.${ncm.slice(6, 8)}`

/** Reduz qualquer código ao SH4: 4 dígitos passam direto, NCM maior é truncado. */
export const sh4DoCodigo = (codigo) => {
    const digitos = String(codigo).replace(/\D/g, '')
    return digitos.length <= 4 ? digitos.padStart(4, '0') : normalizarNcm(codigo).slice(0, 4)
}

/**
 * Catálogo de NCMs classificados como TIC em `ncm_tic`, com a descrição oficial
 * vinda de `geral_ncm`. Só entram códigos que têm grupo — é a lista "apenas com
 * código NCM" usada pelo filtro de produto.
 */
function montarCatalogoNcm(ncmTic, ncmDescricoes) {
    const descricaoPorNcm = new Map(
        ncmDescricoes
            .filter((linha) => linha.descricao_ncm)
            .map((linha) => [normalizarNcm(linha.codigo_ncm), linha.descricao_ncm]),
    )
    const porCodigo = new Map()
    for (const linha of ncmTic) {
        if (!linha.grupo) continue
        const ncm = normalizarNcm(linha.codigo_limpo)
        if (porCodigo.has(ncm)) continue
        porCodigo.set(ncm, {
            ncm,
            sh4: ncm.slice(0, 4),
            grupo: linha.grupo,
            descricao: descricaoPorNcm.get(ncm) ?? null,
        })
    }
    return [...porCodigo.values()].sort((primeiro, segundo) => primeiro.ncm.localeCompare(segundo.ncm))
}

async function carregarTudo() {
    if (cacheEmMemoria) return cacheEmMemoria

    const doCacheLocal = lerCacheLocal()
    if (doCacheLocal) {
        cacheEmMemoria = doCacheLocal
        return doCacheLocal
    }

    const [registros, ncmTic, ncmSetores] = await Promise.all([
        buscarTudo('geral_municipios', 'fluxo,ano,mes,municipio,pais,bloco_economico,codigo_sh4,descricao_sh4,fob_usd,kg_liquido'),
        buscarTudo('ncm_tic', 'codigo_limpo,grupo'),
        buscarTudo('geral_ncm', 'codigo_ncm,descricao_ncm,setor_economico'),
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

    cacheEmMemoria = { registros: registrosLimpos, ncms: montarCatalogoNcm(ncmTic, ncmSetores) }
    salvarCacheLocal(cacheEmMemoria)
    return cacheEmMemoria
}

export async function carregarDatasetV2() {
    return (await carregarTudo()).registros
}

/** Catálogo NCM (só TIC), para o filtro de produto no modo NCM. */
export async function carregarCatalogoNcm() {
    return (await carregarTudo()).ncms
}

/** Totais mensais do Brasil, usados como denominador dos rankings municipais. */
export async function carregarBalancaBrasilV2() {
    if (cacheBalancaBrasil) return cacheBalancaBrasil
    cacheBalancaBrasil = await buscarTudo('balanca_brasil', 'ano,mes,exportacao_fob,importacao_fob')
    return cacheBalancaBrasil
}

export const ehExportacao = (registro) => registro.fluxo === 'Exportacao'
export const ehImportacao = (registro) => registro.fluxo === 'Importacao'
const anoMes = (registro) => `${registro.ano}-${String(registro.mes).padStart(2, '0')}`
export const setorDoRegistro = (registro) => registro.setor ?? 'Outros'
export const grupoDoRegistro = (registro) => registro.grupo ?? 'Outros'

export const FILTROS_INICIAIS_V2 = { fluxo: [], pais: [], setor: [], grupo: [], produtos: [], inicio: '', fim: '' }

// Grupo dos produtos fora do Quadro 8 (FINES) — tudo que não é Economia Digital
export const GRUPO_NAO_CLASSIFICADO = 'Outros'

/** Um registro é do recorte TIC quando tem grupo do Quadro 8 (grupo <> 'Outros'). */
export const ehEconomiaDigital = (registro) => grupoDoRegistro(registro) !== GRUPO_NAO_CLASSIFICADO

/** Recorte TIC da base: usado por filtros, tabelas e gráficos de valores absolutos. */
export const filtrarEconomiaDigital = (registros) => registros.filter(ehEconomiaDigital)

const ROTULO_FLUXO = { Exportacao: 'Exportação', Importacao: 'Importação' }

export function opcoesFiltrosV2(registros) {
    const fluxos = new Set()
    const paises = new Set()
    const municipios = new Set()
    const setores = new Set()
    const setorPorGrupo = new Map()
    const produtos = new Map()
    for (const registro of registros) {
        // Fluxo, país e município existem na base inteira; produto/setor/grupo só
        // entram nos seletores quando são de Economia Digital
        fluxos.add(registro.fluxo)
        paises.add(registro.pais)
        municipios.add(registro.municipio)
        if (!ehEconomiaDigital(registro)) continue
        setores.add(setorDoRegistro(registro))
        if (!setorPorGrupo.has(grupoDoRegistro(registro))) setorPorGrupo.set(grupoDoRegistro(registro), setorDoRegistro(registro))
        if (!produtos.has(registro.codigo_sh4)) {
            const descricao = registro.descricao_sh4 ?? String(registro.codigo_sh4)
            produtos.set(registro.codigo_sh4, {
                label: descricao,
                sh4: String(registro.codigo_sh4).padStart(4, '0'),
                descricao,
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
        // Só os grupos do Quadro 8: o seletor nunca oferece soja, carne, combustível etc.
        grupo: [...setorPorGrupo.entries()]
            .filter(([grupo]) => grupo !== GRUPO_NAO_CLASSIFICADO)
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

/**
 * Opções do filtro "Produto" no modo SH4 — só Economia Digital (grupo <> 'Outros'),
 * encadeadas ao "Grupo" escolhido.
 * O rótulo "8541 — Diodos, transistores…" faz a busca achar por código ou nome.
 */
export function opcoesProdutoSh4(opcoesProduto, grupos) {
    return opcoesProduto
        .filter((opcao) => opcao.grupo !== GRUPO_NAO_CLASSIFICADO)
        .filter((opcao) => !grupos?.length || grupos.includes(opcao.grupo))
        .map((opcao) => ({ ...opcao, codigo: opcao.sh4, label: `${opcao.sh4} — ${opcao.descricao}` }))
}

/**
 * Opções do filtro "Produto" no modo NCM: os códigos de 8 dígitos do Quadro 8,
 * encadeados ao "Grupo". Só entram NCMs cujo SH4 aparece nas transações; o
 * filtro casa pela família SH4 porque `geral_municipios` só tem esse nível.
 */
export function opcoesProdutoNcm(opcoesProduto, grupos, catalogoNcm) {
    const descricaoPorSh4 = new Map(
        opcoesProduto
            .filter((opcao) => opcao.grupo !== GRUPO_NAO_CLASSIFICADO)
            .map((opcao) => [opcao.sh4, opcao.descricao]),
    )
    return catalogoNcm
        .filter((item) => item.grupo !== GRUPO_NAO_CLASSIFICADO && descricaoPorSh4.has(item.sh4))
        .filter((item) => !grupos?.length || grupos.includes(item.grupo))
        .map((item) => {
            const descricao = item.descricao ?? descricaoPorSh4.get(item.sh4)
            return {
                value: item.ncm,
                codigo: item.ncm,
                sh4: item.sh4,
                descricao,
                grupo: item.grupo,
                label: `${formatarNcm(item.ncm)} — ${descricao}`,
                // Deixa a busca achar tanto "8541.21.00" quanto "85412100"
                busca: item.ncm,
            }
        })
}

export function aplicarFiltrosV2(registros, filtros) {
    const inicio = filtros.inicio ? filtros.inicio.slice(0, 7) : null
    const fim = filtros.fim ? filtros.fim.slice(0, 7) : null
    // As transações estão em SH4; um NCM selecionado casa pela sua família SH4
    const sh4Selecionados = filtros.produtos.length
        ? new Set(filtros.produtos.map(sh4DoCodigo))
        : null
    return registros.filter((registro) => {
        if (filtros.fluxo.length && !filtros.fluxo.includes(registro.fluxo)) return false
        if (filtros.pais.length && !filtros.pais.includes(registro.pais)) return false
        if (filtros.setor.length || filtros.grupo?.length) {
            const casaSetor = filtros.setor.includes(setorDoRegistro(registro))
            const casaGrupo = filtros.grupo?.includes(grupoDoRegistro(registro))
            if (!casaSetor && !casaGrupo) return false
        }
        if (sh4Selecionados && !sh4Selecionados.has(sh4DoCodigo(registro.codigo_sh4))) return false
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

const dentroDoPeriodo = (registro, inicio, fim) => {
    const competencia = anoMes(registro)
    return (!inicio || competencia >= inicio.slice(0, 7))
        && (!fim || competencia <= fim.slice(0, 7))
}

/**
 * Top 5 municípios por fluxo no recorte atual.
 *
 * - Brasil: total nacional do mesmo fluxo e período;
 * - Economia Digital: total TIC do escopo/filtros atuais;
 * - Produtos no município: recorte TIC/produto sobre todos os produtos daquele
 *   município, preservando fluxo, país, período e seleção territorial.
 */
export function montarRankingMunicipiosV2(
    registrosRecorte,
    registrosTotaisMunicipios,
    balancaBrasil,
    limite = 5,
) {
    const somarPorMunicipio = (registros) => {
        const porMunicipio = new Map()
        for (const registro of registros) {
            const agregado = porMunicipio.get(registro.municipio) ?? {
                exportado: 0,
                importado: 0,
                produtosExportados: new Map(),
                produtosImportados: new Map(),
            }
            porMunicipio.set(registro.municipio, agregado)
            const valor = Number(registro.fob_usd)
            const produto = registro.descricao_sh4 ?? String(registro.codigo_sh4)
            const chaveProduto = `${registro.codigo_sh4}|${grupoDoRegistro(registro)}`
            if (ehExportacao(registro)) {
                agregado.exportado += valor
                const atual = agregado.produtosExportados.get(chaveProduto) ?? { nome: produto, grupo: grupoDoRegistro(registro), valor: 0 }
                atual.valor += valor
                agregado.produtosExportados.set(chaveProduto, atual)
            }
            if (ehImportacao(registro)) {
                agregado.importado += valor
                const atual = agregado.produtosImportados.get(chaveProduto) ?? { nome: produto, grupo: grupoDoRegistro(registro), valor: 0 }
                atual.valor += valor
                agregado.produtosImportados.set(chaveProduto, atual)
            }
        }
        return porMunicipio
    }

    const recortePorMunicipio = somarPorMunicipio(registrosRecorte)
    const totalPorMunicipio = somarPorMunicipio(registrosTotaisMunicipios)
    const totalDigital = { exportado: 0, importado: 0 }
    for (const agregado of recortePorMunicipio.values()) {
        totalDigital.exportado += agregado.exportado
        totalDigital.importado += agregado.importado
    }

    const totalBrasil = balancaBrasil.reduce((total, registro) => {
        total.exportado += Number(registro.exportacao_fob) || 0
        total.importado += Number(registro.importacao_fob) || 0
        return total
    }, { exportado: 0, importado: 0 })

    // (dividendo / divisor) * 100 = o % exibido; divisor zerado vira null (célula vazia), não 0%
    const participacao = (parte, todo) => (todo > 0 ? (parte / todo) * 100 : null)
    const montarFluxo = (fluxo, rotulo) => [...recortePorMunicipio.entries()]
        .map(([municipio, valores]) => {
            const produtos = fluxo === 'exportado' ? valores.produtosExportados : valores.produtosImportados
            const principal = [...produtos.values()].sort((a, b) => b.valor - a.valor)[0]
            return {
                municipio,
                valor: valores[fluxo],
                produtoPrincipal: principal?.nome ?? null,
                grupoProdutoPrincipal: principal?.grupo ?? null,
            }
        })
        .filter((linha) => linha.valor > 0)
        .sort((a, b) => b.valor - a.valor)
        .slice(0, limite)
        .map((linha, indice) => {
            /*
             * O dividendo é sempre o mesmo — linha.valor, o que o município moveu
             * no recorte. O que muda de coluna para coluna é o divisor. As três
             * bases viajam na linha porque a tabela mostra a conta ao lado do %.
             */
            const baseBrasil = totalBrasil[fluxo] // Brasil inteiro no período, sem filtro de produto
            const baseDigital = totalDigital[fluxo] // soma do recorte digital em todos os municípios do escopo
            const baseMunicipio = totalPorMunicipio.get(linha.municipio)?.[fluxo] ?? 0 // todo o comércio do próprio município
            return {
                id: `${fluxo}:${linha.municipio}`,
                posicao: indice + 1,
                fluxo: rotulo,
                ...linha,
                baseBrasil,
                baseDigital,
                baseMunicipio,
                percentualBrasil: participacao(linha.valor, baseBrasil),
                percentualEconomiaDigital: participacao(linha.valor, baseDigital),
                percentualProdutosMunicipio: participacao(linha.valor, baseMunicipio),
            }
        })

    return [
        ...montarFluxo('exportado', 'Exportação'),
        ...montarFluxo('importado', 'Importação'),
    ]
}

/**
 * Filtra a série nacional pelo período sem aplicar filtros municipais/produto.
 * Quando o usuário não informa uma ponta, usa a cobertura real da base municipal
 * para impedir que meses nacionais sem contraparte no Piauí distorçam a razão.
 */
export function filtrarBalancaBrasilPorPeriodo(registros, inicio, fim, referencia = []) {
    const competencias = referencia.map(anoMes).sort()
    const inicioEfetivo = inicio || competencias[0] || ''
    const fimEfetivo = fim || competencias.at(-1) || ''
    return registros.filter((registro) => dentroDoPeriodo(registro, inicioEfetivo, fimEfetivo))
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

/** Competência numérica ordenável (202403) a partir do ano/mês do registro. */
const competenciaDoRegistro = (registro) => registro.ano * 100 + registro.mes

const estenderFaixa = (faixa, competencia) => (faixa
    ? { inicio: Math.min(faixa.inicio, competencia), fim: Math.max(faixa.fim, competencia) }
    : { inicio: competencia, fim: competencia })

const competenciaLegivel = (competencia) =>
    `${String(competencia % 100).padStart(2, '0')}/${Math.floor(competencia / 100)}`

const periodoLegivel = (faixa) => {
    if (!faixa) return null
    const inicio = competenciaLegivel(faixa.inicio)
    const fim = competenciaLegivel(faixa.fim)
    return inicio === fim ? inicio : `${inicio} – ${fim}`
}

/**
 * Linhas da seção "Países": um registro por país × município × grupo temático ×
 * produto, com valor e peso dos dois fluxos e a faixa de competências em que o
 * fluxo daquela tabela aconteceu. `valor` guarda o fluxo da tabela — é por ele
 * que o ranking e o "Top 5 países" se orientam.
 *
 * Devolve o recorte inteiro, sem teto de linhas: quando havia um (15), a tabela
 * escondia 45 países atrás de 6 e o "Top 5" saía errado, porque o TopPaises
 * soma justamente estas linhas — um país de muitas vendas pequenas não
 * emplacava nenhuma linha no teto e sumia do ranking.
 */
export function montarPaisesPorFluxo(registrosDoEscopo) {
    const vazio = { exportacao: [], importacao: [] }
    if (registrosDoEscopo.length === 0) return vazio

    const porChave = new Map()
    for (const registro of registrosDoEscopo) {
        const grupo = grupoDoRegistro(registro)
        const chave = `${registro.pais}|${registro.municipio}|${grupo}|${registro.codigo_sh4}`
        const agregado = porChave.get(chave) ?? {
            pais: registro.pais,
            municipio: registro.municipio,
            grupo,
            produto: registro.descricao_sh4 ?? registro.codigo_sh4,
            exportado: 0,
            importado: 0,
            kgExportado: 0,
            kgImportado: 0,
            faixaExportacao: null,
            faixaImportacao: null,
        }
        porChave.set(chave, agregado)

        const valor = Number(registro.fob_usd)
        const peso = Number(registro.kg_liquido)
        const competencia = competenciaDoRegistro(registro)
        if (ehExportacao(registro)) {
            agregado.exportado += valor
            agregado.kgExportado += peso
            agregado.faixaExportacao = estenderFaixa(agregado.faixaExportacao, competencia)
        } else if (ehImportacao(registro)) {
            agregado.importado += valor
            agregado.kgImportado += peso
            agregado.faixaImportacao = estenderFaixa(agregado.faixaImportacao, competencia)
        }
    }

    const ranking = (chaveValor, chaveFaixa) =>
        [...porChave.values()]
            .filter((agregado) => agregado[chaveValor] > 0)
            .sort((primeiro, segundo) => segundo[chaveValor] - primeiro[chaveValor])
            .map(({ faixaExportacao, faixaImportacao, ...agregado }) => ({
                ...agregado,
                periodo: periodoLegivel(chaveFaixa === 'faixaExportacao' ? faixaExportacao : faixaImportacao),
                valor: agregado[chaveValor],
            }))

    return {
        exportacao: ranking('exportado', 'faixaExportacao'),
        importacao: ranking('importado', 'faixaImportacao'),
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
