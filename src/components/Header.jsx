import { useEffect, useState } from 'react'
import BotaoTema from './BotaoTema'
import logoSia from '../assets/sia-governo-piaui.png'

const PRODUTOS = [
    'Toolkit de PI',
    'Toolkit de CP',
    'EvidêncIA Digital',
    'EvidêncIA Inovação',
]

const ESCALAS = [0.9, 1, 1.1]
const CHAVE_ESCALA = 'observatorio:escala-fonte'

function escalaInicial() {
    try {
        const salva = Number(localStorage.getItem(CHAVE_ESCALA))
        return ESCALAS.includes(salva) ? salva : 1
    } catch {
        return 1
    }
}

function ControleFonte() {
    const [escala, setEscala] = useState(escalaInicial)
    const indice = ESCALAS.indexOf(escala)

    useEffect(() => {
        document.documentElement.style.fontSize = `${16 * escala}px`
        try {
            localStorage.setItem(CHAVE_ESCALA, String(escala))
        } catch {
            // A preferência continua aplicada durante a sessão.
        }
    }, [escala])

    const ajustar = (deslocamento) => {
        const proximoIndice = Math.min(ESCALAS.length - 1, Math.max(0, indice + deslocamento))
        setEscala(ESCALAS[proximoIndice])
    }

    return (
        <div className="flex shrink-0 items-center gap-2" aria-label="Tamanho da fonte">
            <button
                type="button"
                onClick={() => ajustar(-1)}
                disabled={indice === 0}
                aria-label="Diminuir tamanho da fonte"
                className="flex size-7 items-center justify-center rounded-[4px] bg-[#fdfeff] text-[12px] tracking-[0.4px] text-[#262626] shadow-[0_3px_2px_rgba(0,0,0,0.1)] transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
            >
                A-
            </button>
            <button
                type="button"
                onClick={() => ajustar(1)}
                disabled={indice === ESCALAS.length - 1}
                aria-label="Aumentar tamanho da fonte"
                className="flex size-7 items-center justify-center rounded-[4px] bg-[#fdfeff] text-[12px] tracking-[0.4px] text-[#262626] shadow-[0_3px_2px_rgba(0,0,0,0.1)] transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
            >
                A+
            </button>
        </div>
    )
}

function Separador() {
    return <span aria-hidden="true" className="h-5 w-px shrink-0 bg-[#bfbfbf]" />
}

export default function Header() {
    return (
        <header>
            <div className="flex min-h-[52px] flex-col gap-2 bg-[#eef6ff] px-4 py-2.5 md:px-8 xl:flex-row xl:items-center xl:justify-between">
                <nav aria-label="Produtos SIA" className="min-w-0 overflow-x-auto">
                    <div className="flex min-w-max items-center gap-2">
                        <Separador />
                        {PRODUTOS.map((produto) => (
                            <div key={produto} className="flex items-center gap-2">
                                <span
                                    aria-current={produto === 'EvidêncIA Digital' ? 'page' : undefined}
                                    className={`flex h-8 items-center whitespace-nowrap rounded-[8px] px-3 text-[12px] font-semibold ${
                                        produto === 'EvidêncIA Digital'
                                            ? 'bg-[#034793] text-[#fdfeff]'
                                            : 'text-[#404040]'
                                    }`}
                                >
                                    {produto}
                                </span>
                                <Separador />
                            </div>
                        ))}
                    </div>
                </nav>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <ControleFonte />
                    <BotaoTema />
                </div>
            </div>

            <div className="flex min-h-[64px] items-center justify-between gap-4 bg-[#fdfeff] px-4 py-2 md:px-8">
                <img
                    src={logoSia}
                    alt="Secretaria de Inteligência Artificial, Economia Digital, Ciência, Tecnologia e Inovação — Governo do Estado do Piauí"
                    width="230"
                    height="46"
                    className="h-auto w-[min(230px,68vw)] object-contain"
                />
                <p className="hidden whitespace-nowrap text-[16px] font-semibold text-[#034ea2] sm:block">
                    EvidêncIA Digital
                </p>
            </div>

            <div className="flex min-h-[52px] items-center justify-center bg-[#034ea2] px-4 py-2 md:px-8">
                <nav aria-label="Páginas" className="flex min-w-0 items-center justify-center">
                    <span aria-current="page" className="truncate border-b-2 border-white px-3 py-1.5 text-[12px] font-semibold leading-5 text-white sm:text-[13px]">
                        Exportação e Importação de mercadorias e bens de TICs do Piauí
                    </span>
                </nav>
            </div>
        </header>
    )
}
