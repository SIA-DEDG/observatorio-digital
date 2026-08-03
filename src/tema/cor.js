/*
 * Aritmética de cor compartilhada pelo treemap, pelo mapa e pela auditoria de
 * contraste. Estava duplicada em três lugares com nomes diferentes.
 */

export const canaisDe = (hex) => [1, 3, 5].map((inicio) => parseInt(hex.slice(inicio, inicio + 2), 16))

export const paraHex = (canais) => `#${canais
    .map((canal) => Math.max(0, Math.min(255, Math.round(canal))).toString(16).padStart(2, '0'))
    .join('')}`

/** Escurece a cor: 0 mantém, 1 vira preto. */
export const escurecer = (hex, fator) => paraHex(canaisDe(hex).map((canal) => canal * (1 - fator)))

/** Clareia a cor: 0 mantém, 1 vira branco. Espelho de escurecer(). */
export const clarear = (hex, fator) => paraHex(canaisDe(hex).map((canal) => canal + (255 - canal) * fator))

/**
 * Afasta a cor da superfície do tema: no claro isso é escurecer, no escuro é
 * clarear. A direção vem da paleta, então quem chama não precisa saber o tema.
 */
export const afastar = (hex, { direcao, fator }) =>
    (direcao === 'clarear' ? clarear : escurecer)(hex, fator)

/** Compõe `frente` sobre `fundo` na opacidade dada — cor efetiva de um polígono. */
export const compor = (frente, fundo, opacidade) =>
    paraHex(canaisDe(frente).map((canal, indice) => canal * opacidade + canaisDe(fundo)[indice] * (1 - opacidade)))

const linearizar = (canal) => {
    const normalizado = canal / 255
    return normalizado <= 0.03928
        ? normalizado / 12.92
        : Math.pow((normalizado + 0.055) / 1.055, 2.4)
}

/** Luminância relativa (WCAG 2.x). */
export const luminancia = (hex) => {
    const [r, g, b] = canaisDe(hex).map(linearizar)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razão de contraste WCAG 2.x entre duas cores opacas. */
export function contraste(primeira, segunda) {
    const [clara, escura] = [luminancia(primeira), luminancia(segunda)].sort((a, b) => b - a)
    return (clara + 0.05) / (escura + 0.05)
}
