import { useState } from 'react'
import { codigoDoPais } from '../util/paisesISO'

/**
 * Bandeira do país no set emojione (o mesmo do Figma), servido pela API do
 * Iconify. São SVGs já recortados em círculo, que é o que o design pede —
 * recortar a bandeira retangular no CSS cortaria o desenho (Singapura perderia
 * a lua, a Suíça a cruz).
 *
 * Não dá para usar o emoji de bandeira (🇨🇳): o Windows não traz os glifos de
 * indicador regional e o emoji cai no texto "CN" em todo Chrome/Edge do
 * sistema.
 *
 * Fica só com o nome quando o país não casa com nenhuma região ISO e também
 * quando o set não tem aquele ícone — o ICU resolve nomes que não são país
 * (Zona do Euro, Nações Unidas), e sem isso viraria imagem quebrada.
 */

// O emojione nomeia o ícone pelo país em inglês ("flag-for-germany"), então o
// nome sai do ICU virado em slug. O set é anterior a alguns renomes oficiais
// (Türkiye, Eswatini, Macedônia do Norte) e encurta outros — daí os apelidos.
const APELIDOS_EMOJIONE = {
    CC: 'cocos-islands',
    CI: 'cote-divoire',
    MK: 'macedonia',
    MM: 'myanmar',
    MO: 'macau-sar-china',
    SZ: 'swaziland',
    TR: 'turkey',
    UM: 'us-outlying-islands',
    VI: 'us-virgin-islands',
}

const nomeEmIngles = new Intl.DisplayNames(['en'], { type: 'region' })

// "Bosnia & Herzegovina" -> "bosnia-and-herzegovina"; "São Tomé" -> "sao-tome"
const slug = (nome) =>
    nome
        .replace(/&/g, ' and ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

function iconeDaBandeira(pais) {
    const codigo = codigoDoPais(pais)
    if (!codigo) return null
    return `flag-for-${APELIDOS_EMOJIONE[codigo] ?? slug(nomeEmIngles.of(codigo))}`
}

export default function BandeiraPais({ pais, tamanho = 16 }) {
    const [semBandeira, setSemBandeira] = useState(false)
    const icone = iconeDaBandeira(pais)
    if (!icone || semBandeira) return null

    return (
        <img
            src={`https://api.iconify.design/emojione/${icone}.svg`}
            alt=""
            aria-hidden="true"
            loading="lazy"
            width={tamanho}
            height={tamanho}
            style={{ width: tamanho, height: tamanho }}
            className="shrink-0"
            onError={() => setSemBandeira(true)}
        />
    )
}
