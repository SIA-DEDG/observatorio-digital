import { useCallback, useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'

/**
 * Barra de rolagem horizontal do Figma: setas nas pontas, trilho cinza e
 * polegar azul. Comanda o elemento apontado por `alvoRef` (que esconde a barra
 * nativa com a classe `rolagem-oculta`) e some quando não há o que rolar.
 */

const ESPERA_REPETICAO = 400 // ms segurando a seta antes de a rolagem virar contínua
const PASSO_REPETICAO = 24 // px por tique da rolagem contínua
const INTERVALO_REPETICAO = 30 // ms entre tiques

export default function BarraRolagem({ alvoRef }) {
    const [medida, setMedida] = useState({ transbordo: false, largura: 1, posicao: 0 })
    const refTrilho = useRef(null)
    const refEspera = useRef(null)
    const refRepeticao = useRef(null)
    const repetiu = useRef(false)

    const medir = useCallback(() => {
        const alvo = alvoRef.current
        if (!alvo) return
        const { clientWidth, scrollWidth, scrollLeft } = alvo
        const sobra = scrollWidth - clientWidth
        const nova = {
            transbordo: sobra > 1,
            largura: scrollWidth > 0 ? Math.min(clientWidth / scrollWidth, 1) : 1,
            posicao: sobra > 0 ? Math.min(Math.max(scrollLeft / sobra, 0), 1) : 0,
        }
        // Scroll dispara a cada frame; sem essa comparação todo tique rerrenderiza
        setMedida((atual) =>
            atual.transbordo === nova.transbordo &&
            atual.largura === nova.largura &&
            atual.posicao === nova.posicao
                ? atual
                : nova,
        )
    }, [alvoRef])

    useEffect(() => {
        const alvo = alvoRef.current
        if (!alvo) return

        medir()
        alvo.addEventListener('scroll', medir, { passive: true })
        // A <table> muda de largura quando colunas/linhas mudam, então observa os dois
        const observador = new ResizeObserver(medir)
        observador.observe(alvo)
        if (alvo.firstElementChild) observador.observe(alvo.firstElementChild)

        return () => {
            alvo.removeEventListener('scroll', medir)
            observador.disconnect()
        }
    }, [alvoRef, medir])

    const pararRepeticao = useCallback(() => {
        clearTimeout(refEspera.current)
        clearInterval(refRepeticao.current)
        refEspera.current = null
        refRepeticao.current = null
    }, [])

    useEffect(() => pararRepeticao, [pararRepeticao])

    const rolar = (delta, suave) =>
        alvoRef.current?.scrollBy({ left: delta, behavior: suave ? 'smooth' : 'auto' })

    // Clique dá um passo de meia largura; segurar (pointerdown) passa a rolar contínuo
    const aoClicarSeta = (sentido) => () => {
        if (repetiu.current) {
            repetiu.current = false
            return
        }
        rolar(sentido * (alvoRef.current?.clientWidth ?? 0) * 0.5, true)
    }

    const aoPressionarSeta = (sentido) => (evento) => {
        if (evento.button !== 0) return
        // Zera aqui, não no pointerup: se o cursor sair do botão o click nem chega
        repetiu.current = false
        refEspera.current = setTimeout(() => {
            repetiu.current = true
            refRepeticao.current = setInterval(
                () => rolar(sentido * PASSO_REPETICAO, false),
                INTERVALO_REPETICAO,
            )
        }, ESPERA_REPETICAO)
    }

    // Posiciona o polegar centrado no cursor, como numa barra nativa
    const posicionarPor = (clientX) => {
        const trilho = refTrilho.current
        const alvo = alvoRef.current
        if (!trilho || !alvo) return
        const caixa = trilho.getBoundingClientRect()
        const larguraPolegar = caixa.width * medida.largura
        const curso = caixa.width - larguraPolegar
        if (curso <= 0) return
        const razao = (clientX - caixa.left - larguraPolegar / 2) / curso
        alvo.scrollLeft = Math.min(Math.max(razao, 0), 1) * (alvo.scrollWidth - alvo.clientWidth)
    }

    const aoPressionarTrilho = (evento) => {
        if (evento.button !== 0) return
        evento.currentTarget.setPointerCapture(evento.pointerId)
        posicionarPor(evento.clientX)
    }

    const aoMoverNoTrilho = (evento) => {
        if (evento.currentTarget.hasPointerCapture(evento.pointerId)) posicionarPor(evento.clientX)
    }

    if (!medida.transbordo) return null

    const largura = medida.largura * 100

    return (
        <div className="flex w-full items-center">
            <Seta
                sentido={-1}
                rotulo="Rolar para a esquerda"
                onClick={aoClicarSeta(-1)}
                onPointerDown={aoPressionarSeta(-1)}
                onSoltar={pararRepeticao}
            />

            <div
                ref={refTrilho}
                onPointerDown={aoPressionarTrilho}
                onPointerMove={aoMoverNoTrilho}
                className="relative min-w-0 flex-1 cursor-pointer touch-none py-[7px]"
            >
                <div className="h-[5px] w-full rounded-full bg-borda-forte">
                    <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${largura}%`, marginLeft: `${medida.posicao * (100 - largura)}%` }}
                    />
                </div>
            </div>

            <Seta
                sentido={1}
                rotulo="Rolar para a direita"
                onClick={aoClicarSeta(1)}
                onPointerDown={aoPressionarSeta(1)}
                onSoltar={pararRepeticao}
            />
        </div>
    )
}

function Seta({ sentido, rotulo, onClick, onPointerDown, onSoltar }) {
    return (
        <button
            type="button"
            aria-label={rotulo}
            onClick={onClick}
            onPointerDown={onPointerDown}
            onPointerUp={onSoltar}
            onPointerCancel={onSoltar}
            onPointerLeave={onSoltar}
            className="shrink-0 text-primary transition-opacity hover:opacity-70"
        >
            <Play size={19} fill="currentColor" className={sentido < 0 ? 'rotate-180' : ''} />
        </button>
    )
}
