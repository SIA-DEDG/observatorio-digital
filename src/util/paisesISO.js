// A base grava o país em PORTUGUÊS ("Alemanha", "Japão", "Suíça"), então o mapa
// é montado com os nomes em português do ICU. O inglês entra junto porque o
// dataset antigo usava essa grafia e o custo de manter as duas é zero.
//
// Grafias que NÃO batem com o nome que o ICU dá para a região — "Ivory Coast"
// em vez de "Côte d'Ivoire", "Macedônia" em vez de "Macedônia do Norte". O
// resto sai do Intl.DisplayNames, que conhece todas as regiões ISO.
const apelidosPortugues = {
    Macedônia: 'MK',
    'República Tcheca': 'CZ',
}

const apelidosIngles = {
    Afghanistan: 'AF', Albania: 'AL', Algeria: 'DZ', Angola: 'AO', Argentina: 'AR',
    Armenia: 'AM', Australia: 'AU', Austria: 'AT', Azerbaijan: 'AZ', Bahrain: 'BH',
    Bangladesh: 'BD', Belarus: 'BY', Belgium: 'BE', Bolivia: 'BO',
    'Bosnia and Herzegovina': 'BA', Botswana: 'BW', Brazil: 'BR', Brunei: 'BN',
    Bulgaria: 'BG', 'Burkina Faso': 'BF', Cambodia: 'KH', Cameroon: 'CM', Canada: 'CA',
    'Cabo Verde': 'CV', 'Cape Verde': 'CV', Chile: 'CL', China: 'CN', Colombia: 'CO',
    'Costa Rica': 'CR', Croatia: 'HR', Cuba: 'CU', Cyprus: 'CY', Czechia: 'CZ',
    'Democratic Republic of the Congo': 'CD', 'Dem. Rep. Congo': 'CD', Denmark: 'DK',
    'Dominican Republic': 'DO', Ecuador: 'EC', Egypt: 'EG', 'El Salvador': 'SV',
    Estonia: 'EE', Eswatini: 'SZ', Ethiopia: 'ET', Finland: 'FI', France: 'FR',
    Gabon: 'GA', Gambia: 'GM', Georgia: 'GE', Germany: 'DE', Ghana: 'GH', Greece: 'GR',
    Guatemala: 'GT', Guinea: 'GN', 'Guinea-Bissau': 'GW', Guyana: 'GY', Haiti: 'HT',
    Honduras: 'HN', 'Hong Kong': 'HK', Hungary: 'HU', Iceland: 'IS', India: 'IN',
    Indonesia: 'ID', Iran: 'IR', Iraq: 'IQ', Ireland: 'IE', Israel: 'IL', Italy: 'IT',
    'Ivory Coast': 'CI', "Côte d'Ivoire": 'CI', Jamaica: 'JM', Japan: 'JP', Jordan: 'JO',
    Kazakhstan: 'KZ', Kenya: 'KE', Kuwait: 'KW', Kyrgyzstan: 'KG', Laos: 'LA',
    Latvia: 'LV', Lebanon: 'LB', Liberia: 'LR', Libya: 'LY', Lithuania: 'LT',
    Luxembourg: 'LU', Madagascar: 'MG', Malawi: 'MW', Malaysia: 'MY', Mali: 'ML',
    Malta: 'MT', Mauritania: 'MR', Mauritius: 'MU', Mexico: 'MX', Moldova: 'MD',
    Mongolia: 'MN', Montenegro: 'ME', Morocco: 'MA', Mozambique: 'MZ', Myanmar: 'MM',
    Namibia: 'NA', Nepal: 'NP', Netherlands: 'NL', 'New Zealand': 'NZ', Nicaragua: 'NI',
    Niger: 'NE', Nigeria: 'NG', 'North Macedonia': 'MK', Norway: 'NO', Oman: 'OM',
    Pakistan: 'PK', Panama: 'PA', 'Papua New Guinea': 'PG', Paraguay: 'PY', Peru: 'PE',
    Philippines: 'PH', Poland: 'PL', Portugal: 'PT', Qatar: 'QA', Romania: 'RO',
    Russia: 'RU', 'Saudi Arabia': 'SA', Senegal: 'SN', Serbia: 'RS', 'Sierra Leone': 'SL',
    Singapore: 'SG', Slovakia: 'SK', Slovenia: 'SI', Somalia: 'SO', 'South Africa': 'ZA',
    'South Korea': 'KR', Spain: 'ES', 'Sri Lanka': 'LK', Sudan: 'SD', Suriname: 'SR',
    Sweden: 'SE', Switzerland: 'CH', Syria: 'SY', Taiwan: 'TW', Tajikistan: 'TJ',
    Tanzania: 'TZ', Thailand: 'TH', Togo: 'TG', 'Trinidad and Tobago': 'TT',
    Tunisia: 'TN', Turkey: 'TR', Turkmenistan: 'TM', Uganda: 'UG', Ukraine: 'UA',
    'United Arab Emirates': 'AE', 'United Kingdom': 'GB',
    'United States of America': 'US', 'United States': 'US', Uruguay: 'UY',
    Uzbekistan: 'UZ', Venezuela: 'VE', Vietnam: 'VN', Yemen: 'YE', Zambia: 'ZM',
    Zimbabwe: 'ZW',
}

/**
 * Código depreciado (AN, SU, YU, UK…) — o ICU o canonicaliza para o sucessor.
 * Precisam ficar de fora: o set de bandeiras só tem os códigos vigentes, então
 * um "AN" no lugar de "CW" viraria imagem quebrada.
 */
const codigoVigente = (codigo) => Intl.getCanonicalLocales(`und-${codigo}`)[0].slice(4) === codigo

/** Nome no idioma pedido → alfa-2 para toda região que o ICU conhece (~250 países). */
function mapaDoIntl(idioma) {
    const nomeDaRegiao = new Intl.DisplayNames([idioma], { type: 'region' })
    const mapa = {}
    for (let primeiraLetra = 65; primeiraLetra <= 90; primeiraLetra++) {
        for (let segundaLetra = 65; segundaLetra <= 90; segundaLetra++) {
            const codigo = String.fromCharCode(primeiraLetra, segundaLetra)
            let nome
            try {
                nome = nomeDaRegiao.of(codigo)
            } catch {
                continue
            }
            // Código sem região cadastrada volta igual a si mesmo
            if (!nome || nome === codigo || !codigoVigente(codigo)) continue
            mapa[nome] = codigo
        }
    }
    return mapa
}

/**
 * Chave tolerante à grafia: o parêntese sai inteiro ("Taiwan (Formosa)" ×
 * "Taiwan"), o NFD separa o acento da letra e tudo que não é letra/dígito vira
 * separador, então acento, ponto e "&" somem. As trocas cobrem onde o ICU e a
 * base divergem por convenção — "St. Lucia" × "Saint Lucia", "Trinidad &
 * Tobago" × "Trinidad e Tobago" — e as preposições caem porque a base ora
 * escreve "Costa do Marfim", ora "Costa Marfim".
 */
const chaveDeBusca = (nome) => nome
    .replace(/\(.*?\)/g, ' ')
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bst\b/g, 'saint')
    .replace(/\b(and|e|da|de|do|das|dos)\b/g, '')
    .replace(/\s+/g, '')

/**
 * A base herda do Comex Stat a forma invertida ("Tcheca, República"); o ICU usa
 * a direta. Desinverte para a busca cair no mesmo lugar.
 */
const semInversao = (nome) =>
    nome.includes(',') ? nome.split(',').map((parte) => parte.trim()).reverse().join(' ') : null

// Os apelidos entram por último: onde a base diverge do ICU, a base manda.
const codigoPorNome = Object.fromEntries(
    Object.entries({
        ...mapaDoIntl('en'),
        ...mapaDoIntl('pt'),
        ...apelidosIngles,
        ...apelidosPortugues,
    }).map(([nome, codigo]) => [chaveDeBusca(nome), codigo]),
)

/** Código ISO do país, usado por `BandeiraPais` para montar o nome do ícone. */
export function codigoDoPais(pais) {
    if (!pais) return null
    const nome = String(pais)
    const invertido = semInversao(nome)
    return codigoPorNome[chaveDeBusca(nome)] ?? (invertido ? codigoPorNome[chaveDeBusca(invertido)] ?? null : null)
}
