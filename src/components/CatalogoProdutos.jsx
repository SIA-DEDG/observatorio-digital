import { useMemo } from 'react'
import CelulaNomeProduto from './CelulaNomeProduto'
import DataTable from './DataTable'
import { formatos, numero } from '../util/formats'

const ROTULO_FLUXO = { Exportacao: 'Exportação', Importacao: 'Importação' }

// Sem casas decimais, senão "68.790,445 t" fica igual a "68.790.445 kg" de relance
const toneladas = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

const COLUNAS = [
    { chave: 'produto', label: 'Produtos', alinhamento: 'left', formato: (valor) => <CelulaNomeProduto value={valor} /> },
    { chave: 'categoria', label: 'Categoria', alinhamento: 'left' },
    { chave: 'fluxo', label: 'Fluxo', alinhamento: 'left', formato: (valor) => ROTULO_FLUXO[valor] ?? valor },
    {
        chave: 'sh4',
        label: 'SH4',
        alinhamento: 'left',
        formato: (valor, linha) => (
            <span
                title={linha.produto}
                className="cursor-help rounded-full bg-secondary-100 px-2.5 py-0.5 font-medium text-[#05306a]"
            >
                {valor}
            </span>
        ),
    },
    { chave: 'fob', label: 'Valor FOB', formato: formatos.moedaCompacta, total: true },
    { chave: 'kg', label: 'Peso (kg)', formato: formatos.numero, total: true },
    { chave: 'toneladas', label: 'Quantidade (t)', formato: (valor) => (valor == null ? '-' : toneladas.format(valor)), total: true },
]

export default function CatalogoProdutos({ linhas, altura = 'max-h-[448px]' }) {
    const categorias = useMemo(() => new Set(linhas.map((linha) => linha.categoria)).size, [linhas])
    const produtos = useMemo(() => new Set(linhas.map((linha) => linha.sh4)).size, [linhas])

    return (
        <section className="flex w-full flex-col gap-[14px]">
            {/* Mesmo par título/descrição das seções da aba Detalhamento */}
            <div className="flex flex-col gap-[6px]">
                <h3 className="text-[18px] font-medium text-[#05306a]">Catálogo de Produtos</h3>
                <p className="text-justify text-[16px] font-light text-black">
                    {numero.format(categorias)} categorias e {numero.format(produtos)} produtos.
                    Passe o mouse nos selos SH4 para ver a descrição da classificação.
                </p>
            </div>

            <DataTable
                titulo="Produtos"
                retratil
                colunas={COLUNAS}
                linhas={linhas}
                altura={altura}
                vazio="Nenhum produto para a seleção atual."
            />
        </section>
    )
}
