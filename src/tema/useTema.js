import { useSyncExternalStore } from 'react'

/*
 * Store de módulo em vez de Context: é o padrão que o projeto já usa para estado
 * global (cacheEmMemoria em util/aggregationsV2.js) e evita envolver a árvore
 * inteira num provider só por causa de uma string.
 *
 * A preferência tem três estados; o tema aplicado tem dois. O script inline do
 * index.html já resolveu o primeiro paint, aqui só mantemos os dois em sincronia.
 */
const CHAVE = 'observatorio:tema'
const PREFERENCIAS = ['system', 'light', 'dark']

const consultaEscuro = () =>
    typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null

function lerPreferencia() {
    try {
        const salva = localStorage.getItem(CHAVE)
        return PREFERENCIAS.includes(salva) ? salva : 'system'
    } catch {
        // localStorage lança em contextos de privacidade; cair no sistema
        return 'system'
    }
}

const resolver = (preferencia) =>
    preferencia === 'light' || preferencia === 'dark'
        ? preferencia
        : consultaEscuro()?.matches
            ? 'dark'
            : 'light'

let preferencia = lerPreferencia()
let tema = resolver(preferencia)
const ouvintes = new Set()

function aplicar() {
    const proximo = resolver(preferencia)
    if (proximo === tema) return
    tema = proximo
    // O atributo é o que o CSS lê; color-scheme vem junto pelo seletor [data-theme]
    document.documentElement.dataset.theme = tema
    for (const ouvinte of ouvintes) ouvinte()
}

export function definirPreferencia(nova) {
    if (!PREFERENCIAS.includes(nova) || nova === preferencia) return
    preferencia = nova
    try {
        localStorage.setItem(CHAVE, nova)
    } catch {
        // sem persistência, mas a sessão atual continua respeitando a escolha
    }
    const temaAnterior = tema
    aplicar()
    // A preferência mudou mesmo que o tema resolvido não tenha (ex.: sistema já escuro)
    if (tema === temaAnterior) for (const ouvinte of ouvintes) ouvinte()
}

function inscrever(ouvinte) {
    ouvintes.add(ouvinte)
    return () => ouvintes.delete(ouvinte)
}

// Só importa enquanto a preferência for "system"; aplicar() já checa isso
consultaEscuro()?.addEventListener('change', aplicar)

/** Tema efetivamente aplicado: 'light' ou 'dark'. */
export const useTema = () => useSyncExternalStore(inscrever, () => tema, () => 'light')

/** Preferência escolhida: 'system', 'light' ou 'dark'. */
export const usePreferenciaTema = () =>
    useSyncExternalStore(inscrever, () => preferencia, () => 'system')
