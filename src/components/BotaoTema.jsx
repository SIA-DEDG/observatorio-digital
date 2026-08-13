import { Sun, Moon } from 'lucide-react'
import { definirTema, useTema } from '../tema/useTema'

const OPCOES = [
    { chave: 'light', rotulo: 'Tema claro', icone: Sun },
    { chave: 'dark', rotulo: 'Tema escuro', icone: Moon },
]

/*
 * Os dois cabeçalhos possíveis são escuros (#0E50A6 no claro, #1E252E no escuro),
 * então o controle se apoia no branco e serve os dois temas sem variante.
 */
export default function BotaoTema() {
    const tema = useTema()
    const indiceAtivo = OPCOES.findIndex((opcao) => opcao.chave === tema)

    /*
     * shrink-0: sem isso o flex do cabeçalho espreme o grupo para caber o título
     * (47px em vez de 90px a 320px de largura), os botões se sobrepõem e a
     * pílula deslizante — que é 1/n da largura do grupo — para de casar com o
     * ícone ativo. Quem cede espaço é o título, que já trunca.
     */
    return (
        <div
            role="radiogroup"
            aria-label="Tema da interface"
            className="relative grid shrink-0 grid-cols-2 rounded-full bg-white/15 p-[3px]"
        >
            <span
                aria-hidden="true"
                className="absolute bottom-[3px] left-[3px] top-[3px] rounded-full bg-white transition-transform duration-300 ease-in-out"
                style={{
                    width: `calc((100% - 6px) / ${OPCOES.length})`,
                    transform: `translateX(${indiceAtivo * 100}%)`,
                }}
            />
            {OPCOES.map((opcao, indice) => {
                const Icone = opcao.icone
                const ativo = indice === indiceAtivo
                return (
                    <button
                        key={opcao.chave}
                        type="button"
                        role="radio"
                        aria-checked={ativo}
                        title={opcao.rotulo}
                        onClick={() => definirTema(opcao.chave)}
                        className={`relative z-10 flex h-6 w-7 items-center justify-center rounded-full transition-colors duration-300 ${ativo ? 'text-cabecalho-fundo' : 'text-white/70 hover:text-white'}`}
                    >
                        <Icone size={13} />
                        <span className="sr-only">{opcao.rotulo}</span>
                    </button>
                )
            })}
        </div>
    )
}
