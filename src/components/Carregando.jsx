import { Loader2 } from 'lucide-react'

export default function Carregando({ altura = 'h-[240px]', mensagem = 'Carregando dados…' }) {
    return (
        <div className={`flex w-full flex-col items-center justify-center gap-2 ${altura} text-grey-500`}>
            <Loader2 size={28} className="animate-spin text-primary" />
            <span className="text-[13px]">{mensagem}</span>
        </div>
    )
}
