import { dispararDownload, nomeArquivoComData } from './downloadsV2'

/*
 * Exporta a tabela como ela está na tela: mesmas colunas, mesmas linhas, mesma
 * ordenação. Diferente de downloadsV2, que exporta as transações cruas.
 *
 * O valor exportado é o bruto, não o nó React que `coluna.formato` devolve —
 * planilha quer número, não JSX. Quando o que aparece na tela não é o valor
 * bruto (o rótulo do fluxo, os NCMs da família SH4), a coluna declara
 * `exportar` e essa função decide.
 */

const valorDe = (coluna, linha) => {
    const bruto = linha[coluna.chave]
    if (coluna.exportar) return coluna.exportar(bruto, linha)
    return bruto ?? ''
}

/** Cabeçalho + corpo + linha de totais, na ordem em que a tabela está. */
function montarMatriz(colunas, linhas, totais) {
    const cabecalho = colunas.map((coluna) => coluna.label)
    const corpo = linhas.map((linha) => colunas.map((coluna) => valorDe(coluna, linha)))
    if (totais) {
        corpo.push(colunas.map((coluna, indice) => {
            if (indice === 0) return 'Total'
            return coluna.total ? totais[coluna.chave] ?? '' : ''
        }))
    }
    return { cabecalho, corpo }
}

const semAcento = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
const nomeArquivo = (titulo) => {
    const sufixo = semAcento(String(titulo ?? 'tabela')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    return `${nomeArquivoComData()}-${sufixo || 'tabela'}`
}

export function exportarTabelaJSON(colunas, linhas, { titulo, totais } = {}) {
    const { cabecalho, corpo } = montarMatriz(colunas, linhas, totais)
    const objetos = corpo.map((celulas) => Object.fromEntries(celulas.map((valor, indice) => [cabecalho[indice], valor])))
    dispararDownload(
        new Blob([JSON.stringify(objetos, null, 2)], { type: 'application/json' }),
        `${nomeArquivo(titulo)}.json`,
    )
}

export function exportarTabelaCSV(colunas, linhas, { titulo, totais } = {}) {
    /*
     * Ponto e vírgula e BOM como em downloadsV2: é o que o Excel em pt-BR
     * espera. E se o separador é ponto e vírgula, o decimal precisa ser vírgula
     * — 71909.38 com ponto entra como texto na planilha em pt-BR.
     *
     * As descrições de produto contêm ponto e vírgula, então o escape com aspas
     * não é decorativo: sem ele a linha inteira desalinha as colunas.
     */
    const escapar = (valor) => {
        if (typeof valor === 'number') return String(valor).replace('.', ',')
        const texto = String(valor ?? '')
        return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
    }
    const { cabecalho, corpo } = montarMatriz(colunas, linhas, totais)
    const conteudo = [cabecalho, ...corpo].map((celulas) => celulas.map(escapar).join(';')).join('\n')
    dispararDownload(
        new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8' }),
        `${nomeArquivo(titulo)}.csv`,
    )
}

export async function exportarTabelaXLSX(colunas, linhas, { titulo, totais } = {}) {
    const moduloExcel = await import('exceljs')
    const ExcelJS = moduloExcel?.default?.Workbook ? moduloExcel.default : moduloExcel
    const { cabecalho, corpo } = montarMatriz(colunas, linhas, totais)

    const pastaTrabalho = new ExcelJS.Workbook()
    const planilha = pastaTrabalho.addWorksheet(String(titulo ?? 'Tabela').slice(0, 31))
    planilha.addRow(cabecalho)
    for (const celulas of corpo) planilha.addRow(celulas)
    planilha.getRow(1).font = { bold: true }
    if (totais) planilha.getRow(corpo.length + 1).font = { bold: true }
    // Largura pelo maior conteúdo da coluna, com teto para o nome do produto não esticar a planilha
    planilha.columns = cabecalho.map((rotulo, indice) => ({
        width: Math.min(60, Math.max(rotulo.length + 2, ...corpo.map((celulas) => String(celulas[indice] ?? '').length + 2))),
    }))

    const conteudo = await pastaTrabalho.xlsx.writeBuffer()
    dispararDownload(
        new Blob([conteudo], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `${nomeArquivo(titulo)}.xlsx`,
    )
}
