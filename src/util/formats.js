const numero = new Intl.NumberFormat('pt-BR')
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const moedaCompacta = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 })
const numeroCompacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 2 })

export const formatos = {
    texto: (valor) => valor ?? '-',
    numero: (valor) => (valor == null ? '-' : numero.format(valor)),
    moeda: (valor) => (valor == null ? '-' : moeda.format(valor)),
    moedaCompacta: (valor) => (valor == null ? '-' : moedaCompacta.format(valor)),
    percentual: (valor) => (valor == null ? '-' : `${numero.format(valor)}%`),
    toneladas: (kg) => (kg == null ? '-' : `${numeroCompacto.format(kg / 1000)} t`),
    pesoKg: (kg) => (kg == null ? '-' : `${numeroCompacto.format(kg)} kg`),
}

export { numero, moeda, moedaCompacta, numeroCompacto }
