const COLUNAS = ['fluxo', 'ano', 'mes', 'municipio', 'pais', 'bloco_economico', 'codigo_sh4', 'descricao_sh4', 'fob_usd', 'kg_liquido']

export const nomeArquivoComData = () => `observatorio-piaui-${new Date().toISOString().slice(0, 10)}`

export function dispararDownload(blob, nomeComExtensao) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = nomeComExtensao
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}

const linhasLimpas = (registros) =>
    registros.map((registro) => Object.fromEntries(COLUNAS.map((coluna) => [coluna, registro[coluna]])))

export function baixarJSON(registros) {
    const conteudo = JSON.stringify(linhasLimpas(registros), null, 2)
    dispararDownload(new Blob([conteudo], { type: 'application/json' }), `${nomeArquivoComData()}.json`)
}

export function baixarCSV(registros) {
    const escapar = (valor) => {
        const texto = String(valor ?? '')
        return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
    }
    const linhas = [
        COLUNAS.join(';'),
        ...linhasLimpas(registros).map((linha) => COLUNAS.map((coluna) => escapar(linha[coluna])).join(';')),
    ]
    dispararDownload(new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' }), `${nomeArquivoComData()}.csv`)
}

export async function baixarXLSX(registros) {
    const moduloExcel = await import('exceljs')
    const ExcelJS = moduloExcel?.default?.Workbook ? moduloExcel.default : moduloExcel
    const pastaTrabalho = new ExcelJS.Workbook()
    const planilha = pastaTrabalho.addWorksheet('Dados')
    planilha.columns = COLUNAS.map((coluna) => ({ header: coluna, key: coluna }))
    planilha.addRows(linhasLimpas(registros))
    planilha.getRow(1).font = { bold: true }
    const conteudo = await pastaTrabalho.xlsx.writeBuffer()
    dispararDownload(
        new Blob([conteudo], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `${nomeArquivoComData()}.xlsx`,
    )
}
