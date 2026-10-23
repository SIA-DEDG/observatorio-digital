import { Moon, Sun } from 'lucide-react'
import { definirTema, useTema } from '../tema/useTema'

const OPCOES = [
    { chave: 'light', rotulo: 'Modo Claro', icone: Sun },
    { chave: 'dark', rotulo: 'Modo Escuro', icone: Moon },
]

export default function BotaoTema() {
    const tema = useTema()

    return (
        <div
            role="radiogroup"
            aria-label="Tema da interface"
            className="flex shrink-0 flex-wrap items-center gap-2"
        >
            {OPCOES.map((opcao) => {
                const Icone = opcao.icone
                const ativo = opcao.chave === tema

                return (
                    <button
                        key={opcao.chave}
                        type="button"
                        role="radio"
                        aria-checked={ativo}
                        title={opcao.rotulo}
                        onClick={() => definirTema(opcao.chave)}
                        className={`flex h-7 items-center justify-center gap-1.5 whitespace-nowrap rounded-[4px] bg-[#fdfeff] px-1.5 text-[12px] tracking-[0.4px] text-[#262626] shadow-[0_3px_2px_rgba(0,0,0,0.1)] transition-shadow ${
                            ativo ? 'ring-1 ring-[#034ea2]' : 'hover:ring-1 hover:ring-[#bfbfbf]'
                        }`}
                    >
                        <Icone size={16} aria-hidden="true" />
                        <span>{opcao.rotulo}</span>
                    </button>
                )
            })}
        </div>
    )
}
