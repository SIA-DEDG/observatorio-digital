/*
 * Auditoria de contraste dos dois temas.
 *
 * Os tokens de cromo são lidos direto do index.css (fonte única) e os de
 * visualização de tema/paletas.js. Falha com código 1 se alguma combinação
 * escorregar abaixo do gate — é o que impede o tema de virar "escuro na marra".
 *
 * Gates (WCAG 2.2):
 *   1.4.3  texto normal ................................ 4,5:1
 *   1.4.11 limite de componente, marca de gráfico ...... 3:1
 *
 * Uso: node scripts/contraste.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { PALETAS } from '../src/tema/paletas.js'
import { afastar, compor, contraste } from '../src/tema/cor.js'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const TEXTO = 4.5
const COMPONENTE = 3

/** Lê os primitivos de um bloco do index.css — é ele que manda no cromo. */
function lerTokens(css, seletor) {
    const bloco = css.match(new RegExp(`${seletor}\\s*\\{([\\s\\S]*?)\\n\\}`))
    if (!bloco) throw new Error(`bloco ${seletor} não encontrado em src/index.css`)
    const tokens = {}
    for (const [, nome, valor] of bloco[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6});/g)) {
        tokens[nome] = valor
    }
    return tokens
}

const css = readFileSync(resolve(raiz, 'src/index.css'), 'utf8')
const CROMO = {
    light: lerTokens(css, ':root'),
    dark: lerTokens(css, '\\[data-theme="dark"\\]'),
}

const falhas = []
const verificados = []

function checar(tema, rotulo, frente, fundo, minimo) {
    const razao = contraste(frente, fundo)
    const registro = { tema, rotulo, frente, fundo, razao, minimo }
    verificados.push(registro)
    if (razao < minimo) falhas.push(registro)
}

for (const tema of ['light', 'dark']) {
    const c = CROMO[tema]
    const { grafico, treemap, mapa } = PALETAS[tema]

    // --- texto sobre cada superfície -------------------------------------
    const superficies = ['fundo', 'superficie-1', 'superficie-2', 'superficie-3', 'superficie-elevada']
    for (const superficie of superficies) {
        for (const texto of ['texto-1', 'texto-2', 'texto-3']) {
            checar(tema, `${texto} sobre ${superficie}`, c[texto], c[superficie], TEXTO)
        }
    }

    // --- pares de marca e estado ------------------------------------------
    checar(tema, 'texto-sobre-marca sobre marca-fundo', c['texto-sobre-marca'], c['marca-fundo'], TEXTO)
    checar(tema, 'marca-realce-texto sobre marca-realce', c['marca-realce-texto'], c['marca-realce'], TEXTO)
    checar(tema, 'marca-texto sobre superficie-1', c['marca-texto'], c['superficie-1'], TEXTO)
    checar(tema, 'marca-texto sobre fundo', c['marca-texto'], c['fundo'], TEXTO)
    checar(tema, 'texto-1 sobre marca-suave', c['texto-1'], c['marca-suave'], TEXTO)
    checar(tema, 'texto-2 sobre marca-suave', c['texto-2'], c['marca-suave'], TEXTO)
    checar(tema, 'estado-erro sobre superficie-1', c['estado-erro'], c['superficie-1'], TEXTO)
    checar(tema, 'estado-erro sobre estado-erro-suave', c['estado-erro'], c['estado-erro-suave'], TEXTO)
    checar(tema, 'estado-ok sobre superficie-elevada', c['estado-ok'], c['superficie-elevada'], TEXTO)
    checar(tema, 'texto-sobre-marca sobre chip-icone', c['texto-sobre-marca'], c['chip-icone'], TEXTO)
    checar(tema, 'texto-sobre-marca sobre cabecalho-pilula', c['texto-sobre-marca'], c['cabecalho-pilula'], TEXTO)
    checar(tema, 'texto-sobre-marca sobre destaque-fundo', c['texto-sobre-marca'], c['destaque-fundo'], TEXTO)
    checar(tema, 'destaque-fundo sobre fundo', c['destaque-fundo'], c['fundo'], 1.3)

    // --- limites de componente (1.4.11) -----------------------------------
    checar(tema, 'borda-forte sobre superficie-1', c['borda-forte'], c['superficie-1'], COMPONENTE)
    checar(tema, 'anel-foco sobre superficie-1', c['anel-foco'], c['superficie-1'], COMPONENTE)
    // Não é gate do WCAG: só confere que o painel interno ainda se destaca do
    // card que o abriga. 1,14:1 é o que o tema claro sempre teve.
    checar(tema, 'superficie-elevada sobre marca-suave', c['superficie-elevada'], c['marca-suave'], 1.1)

    // --- séries e eixos dos gráficos --------------------------------------
    for (const serie of ['saldoTradicional', 'saldoRecorte', 'exportacao', 'importacao']) {
        checar(tema, `gráfico ${serie} sobre superficie-1`, grafico[serie], c['superficie-1'], COMPONENTE)
    }
    checar(tema, 'gráfico ticks sobre superficie-1', grafico.ticks, c['superficie-1'], TEXTO)

    // --- treemap: nível de grupo ------------------------------------------
    for (const cor of [...treemap.cores, treemap.caudaCategorica]) {
        checar(tema, `treemap bloco ${cor} sobre superficie-1`, cor, c['superficie-1'], COMPONENTE)
        checar(tema, `treemap tinta sobre bloco ${cor}`, treemap.tintaCategorica, cor, TEXTO)
    }

    // --- treemap: rampa do drill-down, ponta a ponta ----------------------
    const { direcao, inicio, fim } = treemap.rampa
    for (const base of treemap.cores) {
        for (const fator of [inicio, (inicio + fim) / 2, fim]) {
            const passo = afastar(base, { direcao, fator })
            checar(tema, `treemap rampa ${base}@${fator} sobre superficie-1`, passo, c['superficie-1'], COMPONENTE)
            checar(tema, `treemap tinta sobre rampa ${base}@${fator}`, treemap.tintaRampa, passo, TEXTO)
        }
    }
    checar(tema, 'treemap tinta sobre caudaRampa', treemap.tintaRampa, treemap.caudaRampa, TEXTO)

    // --- mapa: polígonos compostos na opacidade real ----------------------
    for (const [territorio, cor] of Object.entries(mapa.territorios)) {
        const dentro = compor(cor, mapa.fundoBasemap, mapa.opacidadeDentro)
        checar(tema, `mapa ${territorio} @${mapa.opacidadeDentro} sobre basemap`, dentro, mapa.fundoBasemap, COMPONENTE)
    }
    checar(tema, 'mapa contorno do estado sobre basemap', mapa.contornoEstado, mapa.fundoBasemap, COMPONENTE)
}

/*
 * Dívida herdada: combinações que já reprovavam antes do tema escuro existir.
 * Ficam listadas em vez de silenciadas para (a) o script poder falhar de
 * verdade em qualquer regressão nova e (b) o passivo continuar visível. Corrigi-
 * las muda o visual do tema claro, então é decisão de design, não de refatoração.
 */
const PENDENCIAS_TEMA_CLARO = new Set([
    'texto-3 sobre fundo',
    'texto-3 sobre superficie-2',
    'texto-3 sobre superficie-3',
    'estado-ok sobre superficie-elevada',
    'borda-forte sobre superficie-1',
    'gráfico saldoRecorte sobre superficie-1',
    'gráfico importacao sobre superficie-1',
    'mapa contorno do estado sobre basemap',
    ...Object.keys(PALETAS.light.mapa.territorios)
        .map((territorio) => `mapa ${territorio} @${PALETAS.light.mapa.opacidadeDentro} sobre basemap`),
])

const herdada = ({ tema, rotulo }) => tema === 'light' && PENDENCIAS_TEMA_CLARO.has(rotulo)

const formatar = ({ tema, rotulo, frente, fundo, razao, minimo }) =>
    `  [${tema}] ${rotulo}: ${razao.toFixed(2)}:1 (mín. ${minimo}:1) — ${frente} sobre ${fundo}`

const regressoes = falhas.filter((falha) => !herdada(falha))
const conhecidas = falhas.filter(herdada)
const resolvidas = verificados.filter((registro) => herdada(registro) && registro.razao >= registro.minimo)

if (conhecidas.length > 0) {
    console.warn(`\n⚠ ${conhecidas.length} pendências herdadas do tema claro (anteriores ao tema escuro):\n`)
    for (const falha of conhecidas) console.warn(formatar(falha))
}

if (resolvidas.length > 0) {
    console.warn(`\n⚠ ${resolvidas.length} pendências já resolvidas — remover de PENDENCIAS_TEMA_CLARO:\n`)
    for (const registro of resolvidas) console.warn(formatar(registro))
}

if (regressoes.length > 0) {
    console.error(`\n✗ ${regressoes.length} de ${verificados.length} combinações abaixo do gate:\n`)
    for (const falha of regressoes) console.error(formatar(falha))
    console.error('')
    process.exit(1)
}

console.log(`✓ ${verificados.length} combinações verificadas — ${regressoes.length} regressões, ${conhecidas.length} pendências herdadas.`)

/*
 * As oito matizes do treemap são calibradas em exatamente 5:1 e a rampa começa
 * no limite do gate: listar tudo que passa raspando encheria a saída de ruído
 * esperado. Só as folgas mais finas interessam, e só do que não é herdado.
 */
const apertadas = verificados
    .filter((registro) => !herdada(registro) && registro.razao >= registro.minimo)
    .sort((a, b) => a.razao / a.minimo - b.razao / b.minimo)
    .slice(0, 8)

console.log('\nMenores folgas — mexer nestes tokens exige remedir:')
for (const registro of apertadas) console.log(formatar(registro))
