import { useSyncExternalStore } from 'react'

/*
 * Store de módulo em vez de Context: é o padrão que o projeto já usa para estado
 * global (cacheEmMemoria em util/aggregationsV2.js) e evita envolver a árvore
 * inteira num provider só por causa de uma string.
 *
 * São dois estados, não três: o tema é sempre escolha explícita e começa no
 * claro. Sem "seguir o sistema", preferência e tema aplicado viraram a mesma
 * coisa — daí um hook só. O script inline do index.html já resolveu o primeiro
 * paint; aqui mantemos o atributo e os assinantes em sincronia.
 */
const CHAVE = 'observatorio:tema'
const TEMAS = ['light', 'dark']
const PADRAO = 'light'

function lerTema() {
    try {
        const salvo = localStorage.getItem(CHAVE)
        // Cai no padrão também para quem tem 'system' gravado de antes
        return TEMAS.includes(salvo) ? salvo : PADRAO
    } catch {
        // localStorage lança em contextos de privacidade
        return PADRAO
    }
}

let tema = lerTema()
const ouvintes = new Set()

export function definirTema(novo) {
    if (!TEMAS.includes(novo) || novo === tema) return
    tema = novo
    try {
        localStorage.setItem(CHAVE, novo)
    } catch {
        // sem persistência, mas a sessão atual continua respeitando a escolha
    }
    // O atributo é o que o CSS lê; color-scheme vem junto pelo seletor [data-theme]
    document.documentElement.dataset.theme = tema
    for (const ouvinte of ouvintes) ouvinte()
}

function inscrever(ouvinte) {
    ouvintes.add(ouvinte)
    return () => ouvintes.delete(ouvinte)
}

/** Tema aplicado: 'light' ou 'dark'. */
export const useTema = () => useSyncExternalStore(inscrever, () => tema, () => PADRAO)
