import { useMemo } from 'react'
import CelulaNomeProduto from './CelulaNomeProduto'
import DataTable from './DataTable'
import { formatos, numero } from '../util/formats'
import { formatarNcm } from '../util/aggregationsV2'
import SecaoDownload from './SecaoDownload'
import { exportarTabelaCSV, exportarTabelaJSON, exportarTabelaXLSX } from '../util/exportarTabela'

const ROTULO_FLUXO = { Exportacao: 'Exportação', Importacao: 'Importação' }

// Sem casas decimais, senão "68.790,445 t" fica igual a "68.790.445 kg" de relance
const toneladas = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

const NCMS_VISIVEIS = 2

const Selo = ({ children, title, neutro = false }) => (
    <span
        title={title}
        className={`cursor-help whitespace-nowrap rounded-full px-2.5 py-0.5 font-medium ${neutro
            ? 'bg-superficie-3 text-texto-2'
            : 'bg-marca-suave text-marca-texto'}`}
    >
        {children}
    </span>
)

/*
 * No modo NCM a coluna passa a listar os códigos de 8 dígitos da família SH4 da
 * linha — restritos à seleção quando existe uma. Os valores continuam somados no
 * nível SH4: `geral_municipios` só guarda esse nível, então não há como repartir
 * FOB e peso por NCM sem inventar número.
 */
function CelulaNcm({ ncms }) {
    if (!ncms || ncms.length === 0) return <span className="text-texto-3">—</span>

    const visiveis = ncms.slice(0, NCMS_VISIVEIS)
    const restantes = ncms.slice(NCMS_VISIVEIS)
    const descrever = ({ ncm, descricao }) => (descricao ? `${formatarNcm(ncm)} — ${descricao}` : formatarNcm(ncm))

    return (
        <span className="flex flex-wrap items-center gap-1">
            {visiveis.map((item) => (
                <Selo key={item.ncm} title={descrever(item)}>{formatarNcm(item.ncm)}</Selo>
            ))}
            {restantes.length > 0 && (
                <Selo neutro title={restantes.map(descrever).join('\n')}>+{restantes.length}</Selo>
            )}
        </span>
    )
}

/*
 * `exportar` entra onde o que se vê difere do valor bruto: o download leva o
 * rótulo do fluxo e o nome completo do produto (a tela trunca), não o dado cru.
 */
const COLUNAS_BASE = [
    { chave: 'produto', label: 'Produtos', alinhamento: 'left', formato: (valor) => <CelulaNomeProduto value={valor} /> },
    { chave: 'categoria', label: 'Categoria', alinhamento: 'left' },
    {
        chave: 'fluxo',
        label: 'Fluxo',
        alinhamento: 'left',
        formato: (valor) => ROTULO_FLUXO[valor] ?? valor,
        exportar: (valor) => ROTULO_FLUXO[valor] ?? valor,
    },
]

const COLUNAS_VALOR = [
    { chave: 'fob', label: 'Valor FOB', formato: formatos.moedaCompacta, total: true },
    { chave: 'kg', label: 'Peso (kg)', formato: formatos.numero, total: true },
    { chave: 'toneladas', label: 'Quantidade (t)', formato: (valor) => (valor == null ? '-' : toneladas.format(valor)), total: true },
]

const COLUNA_SH4 = {
    chave: 'sh4',
    label: 'SH4',
    alinhamento: 'left',
    formato: (valor, linha) => <Selo title={linha.produto}>{valor}</Selo>,
}

export default function CatalogoProdutos({ linhas, altura = 'max-h-[448px]', modo = 'SH4', ncmsPorSh4 = null }) {
    const porNcm = modo === 'NCM' && ncmsPorSh4 !== null

    const colunas = useMemo(() => {
        const coluna = porNcm
            ? {
                chave: 'sh4',
                label: 'NCM',
                alinhamento: 'left',
                formato: (valor) => <CelulaNcm ncms={ncmsPorSh4.get(valor)} />,
                // Na tela cabem dois selos e um "+N"; no arquivo vão todos
                exportar: (valor) => (ncmsPorSh4.get(valor) ?? []).map((item) => formatarNcm(item.ncm)).join(' '),
            }
            : COLUNA_SH4
        return [...COLUNAS_BASE, coluna, ...COLUNAS_VALOR]
    }, [porNcm, ncmsPorSh4])

    const categorias = useMemo(() => new Set(linhas.map((linha) => linha.categoria)).size, [linhas])
    const produtos = useMemo(() => {
        if (!porNcm) return new Set(linhas.map((linha) => linha.sh4)).size
        // No modo NCM a contagem é de códigos de 8 dígitos que aparecem na tabela
        const codigos = new Set()
        for (const linha of linhas) {
            for (const item of ncmsPorSh4.get(linha.sh4) ?? []) codigos.add(item.ncm)
        }
        return codigos.size
    }, [linhas, porNcm, ncmsPorSh4])

    /*
     * O arquivo é a tabela como está na tela. As linhas já chegam filtradas por
     * filtrarEconomiaDigital + os filtros da página, então o recorte vem junto
     * sem este componente saber quais filtros estão ativos.
     *
     * A linha de Total repete a regra do DataTable — soma as colunas marcadas
     * com `total` — para o arquivo fechar com o mesmo número que a tela mostra.
     */
    const totais = useMemo(() => {
        const comTotal = colunas.filter((coluna) => coluna.total)
        if (comTotal.length === 0) return null
        return Object.fromEntries(comTotal.map((coluna) => [
            coluna.chave,
            linhas.reduce((soma, linha) => soma + (Number(linha[coluna.chave]) || 0), 0),
        ]))
    }, [colunas, linhas])

    const opcoesExportacao = { titulo: 'Catálogo de Produtos', totais }
    const geradores = {
        json: () => exportarTabelaJSON(colunas, linhas, opcoesExportacao),
        xlsx: () => exportarTabelaXLSX(colunas, linhas, opcoesExportacao),
        csv: () => exportarTabelaCSV(colunas, linhas, opcoesExportacao),
    }

    return (
        <section className="flex w-full flex-col gap-[14px]">
            {/* Mesmo par título/descrição das seções da aba Detalhamento */}
            <div className="flex flex-col gap-[6px]">
                <h3 className="text-[18px] font-medium text-marca-texto">Catálogo de Produtos</h3>
                <p className="text-justify text-[16px] font-light text-texto-1">
                    {numero.format(categorias)} categorias e {numero.format(produtos)} {porNcm ? 'NCMs' : 'produtos'}.
                    {porNcm
                        ? ' Passe o mouse nos selos NCM para ver a descrição do código. Valor e peso continuam somados por família SH4, que é o nível registrado nas transações.'
                        : ' Passe o mouse nos selos SH4 para ver a descrição da classificação.'}
                </p>
            </div>

            <DataTable
                titulo="Produtos"
                retratil
                colunas={colunas}
                linhas={linhas}
                altura={altura}
                vazio="Nenhum produto para a seleção atual."
            />

            <SecaoDownload
                descricao="Baixe o catálogo acima nos formatos abaixo, com os filtros aplicados."
                desabilitado={linhas.length === 0}
                geradores={geradores}
            />
        </section>
    )
}
