import { useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

const LIMITE_NOME = 40

export default function CelulaNomeProduto({ value, limite = LIMITE_NOME }) {
    const [aberto, setAberto] = useState(false)
    const texto = value ?? '-'
    const textoLongo = texto.length > limite
    const textoExibido = aberto || !textoLongo ? texto : `${texto.slice(0, limite)}…`

    return (
        <div className="flex items-start gap-1.5">
            <span className={aberto ? 'block max-w-[240px] whitespace-normal break-words' : ''}>{textoExibido}</span>
            {textoLongo && (
                <button
                    type="button"
                    onClick={() => setAberto((atual) => !atual)}
                    title={aberto ? 'Retrair' : 'Expandir'}
                    aria-label={aberto ? 'Retrair' : 'Expandir'}
                    className="mt-0.5 shrink-0 text-primary transition-colors hover:text-primary/70"
                >
                    {aberto ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
            )}
        </div>
    )
}

export const formatoNomeProduto = (value) => <CelulaNomeProduto value={value} />
