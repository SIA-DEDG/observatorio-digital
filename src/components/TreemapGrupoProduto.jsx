import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { moedaCompacta } from '../util/formats'
import { usePaleta } from '../tema/paletas'
import { afastar } from '../tema/cor'

// A paleta (a mesma nos dois temas) e a rampa vivem em tema/paletas.js
const LIMITE_BLOCOS = 8

// Proporção de referência usada para deixar os blocos quadrados; a saída vira %
const LARGURA_BASE = 1067
const ALTURA_BASE = 360

const percentual = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

// Largura média de um caractere e altura da linha, ambas como fração da fonte
const LARGURA_CARACTERE = 0.56
const ALTURA_LINHA = 1.22
const TAMANHO_MIN = 7
const TAMANHO_MAX = 18
// Divisor da raiz da área: quanto maior, menor o texto para o mesmo bloco
const DIVISOR_AREA = 12
// "-US$ 180,87 mi · 82,7%" tem ~22 caracteres
const CARACTERES_COM_MOEDA = 22

/**
 * Tipografia proporcional ao bloco: o tamanho parte da área do retângulo, é
 * reduzido até a maior palavra do nome caber na largura, e o número de linhas
 * vem da altura que sobra depois de reservar a linha do valor. Assim o bloco
 * grande ganha texto grande e o pequeno ainda mostra nome e porcentagem.
 * Devolve `null` quando não há espaço para nada além do tooltip.
 */
function medidaDoTexto(nome, larguraPx, alturaPx) {
    const recuo = Math.max(3, Math.min(12, Math.round(Math.min(larguraPx, alturaPx) * 0.08)))
    const larguraUtil = larguraPx - recuo * 2
    const alturaUtil = alturaPx - recuo * 2
    if (larguraUtil < 14 || alturaUtil < 9) return null

    const maiorPalavra = Math.max(...nome.split(/\s+/).map((palavra) => palavra.length), 1)
    const tamanhoNome = Math.max(TAMANHO_MIN, Math.min(
        TAMANHO_MAX,
        Math.min(
            Math.sqrt(larguraPx * alturaPx) / DIVISOR_AREA,
            larguraUtil / (LARGURA_CARACTERE * maiorPalavra),
        ),
    ))

    const tamanhoValor = Math.max(TAMANHO_MIN, tamanhoNome * 0.8)
    const cabeValor = alturaUtil >= (tamanhoNome + tamanhoValor) * ALTURA_LINHA
    const alturaParaNome = cabeValor ? alturaUtil - tamanhoValor * ALTURA_LINHA : alturaUtil
    const linhas = Math.floor(alturaParaNome / (tamanhoNome * ALTURA_LINHA))
    if (linhas < 1) return null

    return {
        recuo,
        nome: Math.round(tamanhoNome),
        valor: cabeValor ? Math.round(tamanhoValor) : 0,
        linhas: Math.min(linhas, 3),
        comMoeda: larguraUtil >= tamanhoValor * LARGURA_CARACTERE * CARACTERES_COM_MOEDA,
    }
}

/** Mede o container para converter as posições em % de volta para pixels. */
function useDimensoes() {
    const referencia = useRef(null)
    const [dimensoes, setDimensoes] = useState({ largura: LARGURA_BASE, altura: ALTURA_BASE })

    useEffect(() => {
        const elemento = referencia.current
        if (!elemento || typeof ResizeObserver === 'undefined') return
        const observador = new ResizeObserver(([entrada]) => {
            const { width, height } = entrada.contentRect
            if (width > 0 && height > 0) setDimensoes({ largura: width, altura: height })
        })
        observador.observe(elemento)
        return () => observador.disconnect()
    }, [])

    return [referencia, dimensoes]
}

const embaralhar = (nome) => {
    let acumulado = 0
    for (let posicao = 0; posicao < nome.length; posicao += 1) {
        acumulado = (acumulado * 31 + nome.charCodeAt(posicao)) % 2147483647
    }
    return acumulado
}

/**
 * A cor acompanha o grupo/produto, não a posição — filtrar não repinta quem
 * sobrou. Em caso de colisão, cai na próxima cor livre para nunca repetir na
 * mesma tela.
 *
 * Devolve também a tinta do rótulo: ela depende do nível, não só do tema. A
 * regra é uma só — a rampa se afasta da superfície do card e a tinta é o polo
 * oposto dela.
 */
function atribuirCores(blocos, grupoAtual, tm) {
    // No nível de produto todos pertencem ao mesmo grupo: variam em tom, não em
    // matiz — é o que faz o setor ser legível de relance, como no Atlas.
    if (grupoAtual) {
        const base = corCategorica(grupoAtual, tm.cores)
        const ordem = new Map(blocos.map((bloco, indice) => [bloco.nome, indice]))
        const maximo = Math.max(blocos.length - 1, 1)
        const { direcao, inicio, fim } = tm.rampa
        /*
         * No claro: maior saldo no tom mais claro, descendo até o mais escuro; a
         * rampa é curta porque a base já é funda (55% daqui chegava perto do
         * preto). No escuro a direção inverte — escurecer levaria a ponta abaixo
         * de 3:1 contra o card.
         */
        return {
            corDe: (bloco) => (bloco.cauda
                ? tm.caudaRampa
                : afastar(base, { direcao, fator: inicio + ((ordem.get(bloco.nome) ?? 0) / maximo) * (fim - inicio) })),
            tinta: tm.tintaRampa,
        }
    }

    const usadas = new Set()
    const porNome = new Map()
    const nomes = blocos.filter((bloco) => !bloco.cauda).map((bloco) => bloco.nome).sort()
    for (const nome of nomes) {
        let indice = embaralhar(nome) % tm.cores.length
        for (let tentativa = 0; tentativa < tm.cores.length && usadas.has(indice); tentativa += 1) {
            indice = (indice + 1) % tm.cores.length
        }
        usadas.add(indice)
        porNome.set(nome, tm.cores[indice])
    }
    return {
        corDe: (bloco) => (bloco.cauda ? tm.caudaCategorica : porNome.get(bloco.nome) ?? tm.caudaCategorica),
        tinta: tm.tintaCategorica,
    }
}

const corCategorica = (nome, cores) => cores[embaralhar(nome) % cores.length]

const piorProporcao = (areas, soma, lado) => {
    if (soma <= 0) return Infinity
    const maior = Math.max(...areas)
    const menor = Math.min(...areas)
    return Math.max((lado * lado * maior) / (soma * soma), (soma * soma) / (lado * lado * menor))
}

/** Squarified treemap (Bruls, Huizing & van Wijk) — retorna retângulos em %. */
function calcularRetangulos(blocos) {
    const retangulos = []
    let x = 0
    let y = 0
    let larguraLivre = LARGURA_BASE
    let alturaLivre = ALTURA_BASE
    let indice = 0

    while (indice < blocos.length && larguraLivre > 0.5 && alturaLivre > 0.5) {
        const totalRestante = blocos.slice(indice).reduce((soma, bloco) => soma + bloco.valor, 0)
        if (totalRestante <= 0) break
        const escala = (larguraLivre * alturaLivre) / totalRestante
        const lado = Math.min(larguraLivre, alturaLivre)

        const areas = []
        let somaLinha = 0
        let fim = indice
        while (fim < blocos.length) {
            const area = blocos[fim].valor * escala
            if (areas.length > 0 && piorProporcao([...areas, area], somaLinha + area, lado) > piorProporcao(areas, somaLinha, lado)) break
            areas.push(area)
            somaLinha += area
            fim += 1
        }

        const horizontal = larguraLivre >= alturaLivre
        const espessura = somaLinha / lado
        let deslocamento = 0
        for (let posicao = 0; posicao < areas.length; posicao += 1) {
            const comprimento = areas[posicao] / espessura
            retangulos.push({
                bloco: blocos[indice + posicao],
                x: ((horizontal ? x : x + deslocamento) / LARGURA_BASE) * 100,
                y: ((horizontal ? y + deslocamento : y) / ALTURA_BASE) * 100,
                largura: ((horizontal ? espessura : comprimento) / LARGURA_BASE) * 100,
                altura: ((horizontal ? comprimento : espessura) / ALTURA_BASE) * 100,
            })
            deslocamento += comprimento
        }

        if (horizontal) {
            x += espessura
            larguraLivre -= espessura
        } else {
            y += espessura
            alturaLivre -= espessura
        }
        indice = fim
    }
    return retangulos
}

/** Agrupa a cauda longa em vez de gerar cores novas. */
function agruparCauda(blocos) {
    if (blocos.length <= LIMITE_BLOCOS) return blocos
    const principais = blocos.slice(0, LIMITE_BLOCOS - 1)
    const cauda = blocos.slice(LIMITE_BLOCOS - 1)
    return [
        ...principais,
        {
            nome: `Demais (${cauda.length})`,
            saldo: cauda.reduce((soma, bloco) => soma + bloco.saldo, 0),
            valor: cauda.reduce((soma, bloco) => soma + bloco.valor, 0),
            percentual: cauda.reduce((soma, bloco) => soma + bloco.percentual, 0),
            cauda: true,
        },
    ]
}

const LARGURA_DICA = 268

function Dica({ bloco, x, y, cor, limite }) {
    const linhas = [
        ['Grupo', bloco.grupo],
        ['Exportação', moedaCompacta.format(bloco.exportado)],
        ['Importação', moedaCompacta.format(bloco.importado)],
        ['Saldo', moedaCompacta.format(bloco.saldo)],
        ['Participação', `${percentual.format(bloco.percentual)}%`],
    ].filter(([, valor]) => valor != null)

    // Vira para a esquerda quando não cabe à direita do cursor
    const esquerda = Math.max(0, Math.min(x + 14, limite.largura - LARGURA_DICA))
    const topo = Math.max(0, Math.min(y + 14, Math.max(limite.altura - 190, 0)))

    return (
        <div
            className="pointer-events-none absolute z-30 rounded-[8px] border border-borda bg-superficie-3 shadow-lg"
            style={{ left: esquerda, top: topo, width: LARGURA_DICA }}
        >
            <div className="flex items-center gap-2 border-b border-borda-sutil px-3 py-2">
                <span className="size-[10px] shrink-0 rounded-sm" style={{ backgroundColor: cor }} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-texto-1" title={bloco.nome}>
                    {bloco.nome}
                </span>
                {bloco.codigo && (
                    <span className="shrink-0 text-[11px] text-texto-3">{bloco.codigo}</span>
                )}
            </div>
            <dl className="flex flex-col gap-1 px-3 py-2">
                {linhas.map(([rotulo, valor]) => (
                    <div key={rotulo} className="flex items-baseline justify-between gap-3 text-[12px]">
                        <dt className="text-texto-2">{rotulo}</dt>
                        <dd className="tabular-nums font-medium text-texto-1">{valor}</dd>
                    </div>
                ))}
            </dl>
        </div>
    )
}

export default function TreemapGrupoProduto({ blocos, nivel, caminho, grupos = [], onSelecionarGrupo, onLimparGrupo }) {
    const { treemap } = usePaleta()
    const visiveis = agruparCauda(blocos)
    const retangulos = calcularRetangulos(visiveis)
    const porProduto = nivel === 'produto'
    // Um grupo só define a rampa de tons; com vários, volta para cores categóricas
    const { corDe, tinta } = atribuirCores(visiveis, porProduto && grupos.length === 1 ? grupos[0] : null, treemap)
    const nomeGrupos = grupos.join(', ')
    const [referenciaMapa, dimensoes] = useDimensoes()
    const [dica, setDica] = useState(null)

    const aoMover = (bloco) => (evento) => {
        const area = referenciaMapa.current?.getBoundingClientRect()
        if (!area) return
        setDica({ bloco, x: evento.clientX - area.left, y: evento.clientY - area.top })
    }

    return (
        <section className="flex w-full flex-col gap-3">
            <div className="flex flex-col gap-1">
                <h2 className="text-[20px] font-bold text-texto-1">
                    {porProduto ? nomeGrupos : 'Grupos'}
                </h2>
                <p className="text-[16px] text-texto-1">
                    {porProduto
                        ? `Saldo comercial por produto (SH4) dentro de ${nomeGrupos}`
                        : 'Saldo comercial por grupo temático'} — a área de cada bloco é o tamanho do saldo.
                </p>
            </div>

            {retangulos.length === 0
                ? <p className="py-10 text-center text-[14px] text-texto-3">Sem saldo para a seleção atual.</p>
                : (
                    <>
                        <div
                            ref={referenciaMapa}
                            onMouseLeave={() => setDica(null)}
                            className="relative h-[360px] w-full overflow-hidden rounded-[10px] bg-superficie-1"
                        >
                            {retangulos.map(({ bloco, x, y, largura, altura }) => {
                                const porcentagem = `${percentual.format(bloco.percentual)}%`
                                const podeSelecionar = !porProduto && !bloco.cauda
                                const Elemento = podeSelecionar ? 'button' : 'div'
                                const fundo = corDe(bloco)

                                const larguraPx = (largura / 100) * dimensoes.largura
                                const alturaPx = (altura / 100) * dimensoes.altura
                                const faixa = medidaDoTexto(bloco.nome, larguraPx, alturaPx)

                                return (
                                    <Elemento
                                        key={bloco.nome}
                                        type={podeSelecionar ? 'button' : undefined}
                                        onClick={podeSelecionar ? () => onSelecionarGrupo?.(bloco.nome) : undefined}
                                        onMouseMove={aoMover(bloco)}
                                        className={`absolute flex flex-col justify-start overflow-hidden text-left transition-opacity ${podeSelecionar ? 'hover:opacity-85' : ''}`}
                                        style={{
                                            left: `${x}%`,
                                            top: `${y}%`,
                                            width: `calc(${largura}% - 2px)`,
                                            height: `calc(${altura}% - 2px)`,
                                            backgroundColor: fundo,
                                            color: tinta,
                                            padding: faixa ? `${faixa.recuo}px` : 0,
                                        }}
                                    >
                                        {faixa && (
                                            <span
                                                className="font-semibold"
                                                style={{
                                                    fontSize: `${faixa.nome}px`,
                                                    lineHeight: ALTURA_LINHA,
                                                    display: '-webkit-box',
                                                    WebkitBoxOrient: 'vertical',
                                                    WebkitLineClamp: faixa.linhas,
                                                    overflow: 'hidden',
                                                    overflowWrap: 'break-word',
                                                }}
                                            >
                                                {bloco.nome}
                                            </span>
                                        )}
                                        {faixa && faixa.valor > 0 && (
                                            <span
                                                className="truncate opacity-90"
                                                style={{ fontSize: `${faixa.valor}px`, lineHeight: ALTURA_LINHA }}
                                            >
                                                {faixa.comMoeda
                                                    ? `${moedaCompacta.format(bloco.saldo)} · ${porcentagem}`
                                                    : porcentagem}
                                            </span>
                                        )}
                                    </Elemento>
                                )
                            })}

                            {dica && (
                                <Dica
                                    bloco={dica.bloco}
                                    x={dica.x}
                                    y={dica.y}
                                    cor={corDe(dica.bloco)}
                                    limite={dimensoes}
                                />
                            )}
                        </div>

                        <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
                            {retangulos.map(({ bloco }) => (
                                <li key={bloco.nome} className="flex items-center gap-2 text-[13px]">
                                    <span className="size-[10px] shrink-0 rounded-sm" style={{ backgroundColor: corDe(bloco) }} />
                                    <span className="truncate text-texto-1" title={bloco.nome}>{bloco.nome}</span>
                                    <span className="ml-auto shrink-0 tabular-nums text-texto-2">
                                        {moedaCompacta.format(bloco.saldo)} · {percentual.format(bloco.percentual)}%
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}

            {/*
              * Em coluna estreita o rastro quebrava em duas linhas e deixava o
              * chevron pendurado sozinho. Vira uma faixa rolável na horizontal —
              * a hierarquia continua legível em uma linha só. De lg em diante
              * sobra largura e ele volta a simplesmente quebrar.
              */}
            <div className="rolagem-oculta flex items-center gap-1 overflow-x-auto text-[13px] lg:flex-wrap lg:overflow-x-visible">
                <button
                    type="button"
                    onClick={onLimparGrupo}
                    disabled={caminho.length === 0}
                    className="shrink-0 whitespace-nowrap rounded-full bg-superficie-3 px-3 py-1 text-texto-2 transition-colors enabled:hover:bg-marca-suave disabled:cursor-default"
                >
                    Todos os grupos
                </button>
                {caminho.map((etapa) => (
                    <span key={etapa} className="flex shrink-0 items-center gap-1">
                        <ChevronRight size={14} className="shrink-0 text-texto-3" />
                        <span className="whitespace-nowrap rounded-full bg-marca-suave px-3 py-1 text-texto-1">{etapa}</span>
                    </span>
                ))}
            </div>
        </section>
    )
}
