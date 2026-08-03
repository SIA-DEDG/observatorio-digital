import BandeiraPais from './BandeiraPais'
import { countryNamesPt } from '../util/countryNames'

/** Faixa "Top 5 países" que encabeça cada tabela da seção Países. */
export default function TopPaises({ linhas, limite = 5 }) {
    const porPais = new Map()
    for (const linha of linhas) {
        porPais.set(linha.pais, (porPais.get(linha.pais) ?? 0) + Number(linha.valor ?? 0))
    }
    const top = [...porPais.entries()]
        .sort((primeiro, segundo) => segundo[1] - primeiro[1])
        .slice(0, limite)

    if (top.length === 0) return null

    return (
        <div className="flex flex-col gap-[6px] border-b border-borda px-[10px] py-3">
            <span className="text-[12px] font-medium text-texto-1">Top {top.length} países</span>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {top.map(([pais]) => (
                    <span key={pais} className="flex items-center gap-[6px] text-[14px] text-texto-1">
                        <BandeiraPais pais={pais} />
                        {countryNamesPt[pais] ?? pais}
                    </span>
                ))}
            </div>
        </div>
    )
}
