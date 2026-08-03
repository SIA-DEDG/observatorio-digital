import { useEffect, useMemo, useState } from 'react'
import BalancaComercialView from './BalancaComercialView'
import { montarBalanca, montarTreemapGrupoProduto, montarCatalogoProdutos } from '../util/balanca'
import {
    carregarDatasetV2,
    carregarCatalogoNcm,
    opcoesFiltrosV2,
    aplicarFiltrosV2,
    filtrarEconomiaDigital,
    opcoesProdutoSh4,
    opcoesProdutoNcm,
    FILTROS_INICIAIS_V2,
} from '../util/aggregationsV2'

const FILTROS_INICIAIS = { inicio: '', fim: '', grupo: [], produtos: [] }
// Sem grupo/produto escolhido, o recorte é a Economia Digital inteira
const ROTULO_PADRAO = 'Economia Digital'

export default function BalancaComercial({ children }) {
    const [filtros, setFiltros] = useState(FILTROS_INICIAIS)
    // NCM é o nível em que a equipe pensa o Quadro 8; SH4 fica a um clique
    const [modoCodigo, setModoCodigo] = useState('NCM')
    const [dataset, setDataset] = useState(null)
    const [catalogoNcm, setCatalogoNcm] = useState([])
    const [erroCarga, setErroCarga] = useState(null)

    useEffect(() => {
        Promise.all([carregarDatasetV2(), carregarCatalogoNcm()])
            .then(([registros, ncms]) => { setDataset(registros); setCatalogoNcm(ncms) })
            .catch((erro) => { console.error('carregarDatasetV2:', erro.message); setErroCarga(erro.message) })
    }, [])

    const opcoesFiltros = useMemo(() => (dataset ? opcoesFiltrosV2(dataset) : null), [dataset])
    // Seletores só oferecem Economia Digital; o modo troca o nível do código
    const opcoesProduto = useMemo(() => {
        const produtos = opcoesFiltros?.produtos ?? []
        return modoCodigo === 'NCM'
            ? opcoesProdutoNcm(produtos, filtros.grupo, catalogoNcm)
            : opcoesProdutoSh4(produtos, filtros.grupo)
    }, [opcoesFiltros, filtros.grupo, modoCodigo, catalogoNcm])

    const { balanca, registrosRecorte } = useMemo(() => {
        if (!dataset) return { balanca: null, registrosRecorte: [] }
        const periodo = { ...FILTROS_INICIAIS_V2, inicio: filtros.inicio, fim: filtros.fim }
        // Base total (inclui 'Outros') — é o denominador dos percentuais de participação
        const registrosTotal = aplicarFiltrosV2(dataset, periodo)
        // Recorte TIC — valores absolutos de cards, gráficos e tabelas
        const recorte = filtrarEconomiaDigital(
            aplicarFiltrosV2(dataset, { ...periodo, grupo: filtros.grupo, produtos: filtros.produtos }),
        )
        return { balanca: montarBalanca(registrosTotal, recorte), registrosRecorte: recorte }
    }, [dataset, filtros])

    const catalogo = useMemo(() => montarCatalogoProdutos(registrosRecorte), [registrosRecorte])

    /*
     * No modo NCM a coluna de código da tabela deixa de ser o SH4 e passa a listar
     * os NCMs daquela família — restritos à seleção, quando existe uma. As linhas
     * seguem agregadas por SH4: é o único nível que `geral_municipios` guarda.
     */
    const ncmsPorSh4 = useMemo(() => {
        if (modoCodigo !== 'NCM') return null
        const selecionados = filtros.produtos.length > 0 ? new Set(filtros.produtos) : null
        const porSh4 = new Map()
        for (const opcao of opcoesProduto) {
            if (selecionados && !selecionados.has(opcao.value)) continue
            const lista = porSh4.get(opcao.sh4) ?? []
            lista.push({ ncm: opcao.value, descricao: opcao.descricao })
            porSh4.set(opcao.sh4, lista)
        }
        return porSh4
    }, [modoCodigo, opcoesProduto, filtros.produtos])

    const rotuloProdutos = filtros.produtos
        .map((codigo) => opcoesProduto.find((opcao) => opcao.value === codigo)?.descricao ?? codigo)

    /*
     * O treemap fica sempre um nível acima da seleção: com um produto escolhido
     * ele mostra o GRUPO daquele produto com todos os seus irmãos (senão o
     * produto apareceria sozinho, ocupando 100%). Sem seleção, mostra os grupos.
     */
    const gruposDoTreemap = filtros.grupo.length > 0
        ? filtros.grupo
        : [...new Set(filtros.produtos
            .map((codigo) => opcoesProduto.find((opcao) => opcao.value === codigo)?.grupo)
            .filter(Boolean))]
    const porProduto = gruposDoTreemap.length > 0
    const chaveGrupos = gruposDoTreemap.join('|')

    const blocosTreemap = useMemo(() => {
        if (!dataset) return []
        const escopo = filtrarEconomiaDigital(aplicarFiltrosV2(dataset, {
            ...FILTROS_INICIAIS_V2,
            inicio: filtros.inicio,
            fim: filtros.fim,
            grupo: chaveGrupos ? chaveGrupos.split('|') : [],
        }))
        return montarTreemapGrupoProduto(escopo, { porProduto })
    }, [dataset, filtros.inicio, filtros.fim, chaveGrupos, porProduto])
    const rotuloRecorte = [...filtros.grupo, ...rotuloProdutos].join(', ') || ROTULO_PADRAO

    const periodo = filtros.inicio || filtros.fim
        ? `${filtros.inicio || '...'} a ${filtros.fim || '...'}`
        : 'todo o período'
    const intervaloAnos = balanca?.anos ? `${balanca.anos.inicio} - ${balanca.anos.fim}` : '—'

    const mudarFiltros = (mudancas) => setFiltros((atuais) => ({ ...atuais, ...mudancas }))

    const chips = []
    for (const grupo of filtros.grupo) {
        chips.push({
            chave: `grupo:${grupo}`,
            rotulo: `Grupo: ${grupo}`,
            remover: () => mudarFiltros({ grupo: filtros.grupo.filter((item) => item !== grupo), produtos: [] }),
        })
    }
    for (const codigo of filtros.produtos) {
        const opcao = opcoesProduto.find((item) => item.value === codigo)
        chips.push({
            chave: `produto:${codigo}`,
            rotulo: `Produto: ${opcao?.descricao ?? codigo}`,
            remover: () => mudarFiltros({ produtos: filtros.produtos.filter((item) => item !== codigo) }),
        })
    }
    if (filtros.inicio || filtros.fim) {
        chips.push({
            chave: 'periodo',
            rotulo: `Período: ${periodo}`,
            remover: () => mudarFiltros({ inicio: '', fim: '' }),
        })
    }

    if (erroCarga) {
        return (
            <div className="rounded-lg border border-estado-erro bg-estado-erro-suave px-4 py-3 text-[13px] text-estado-erro">
                Falha ao carregar dados do banco: {erroCarga}
            </div>
        )
    }

    return (
        <BalancaComercialView
            carregando={!dataset}
            balanca={balanca}

            rotuloRecorte={rotuloRecorte}
            periodo={periodo}
            intervaloAnos={intervaloAnos}
            chips={chips}
            onLimparTudo={() => setFiltros(FILTROS_INICIAIS)}
            filtro={{
                periodo: {
                    inicio: filtros.inicio,
                    fim: filtros.fim,
                    onChange: (campo, valor) => mudarFiltros({ [campo]: valor }),
                },
                grupo: {
                    options: opcoesFiltros?.grupo ?? [],
                    value: filtros.grupo,
                    onChange: (valores) => mudarFiltros({ grupo: valores, produtos: [] }),
                },
                produto: {
                    options: opcoesProduto,
                    value: filtros.produtos,
                    onChange: (valores) => mudarFiltros({ produtos: valores }),
                    modo: modoCodigo,
                    onModoChange: (modo) => { setModoCodigo(modo); mudarFiltros({ produtos: [] }) },
                },
            }}
            treemap={{
                blocos: blocosTreemap,
                nivel: porProduto ? 'produto' : 'grupo',
                grupos: gruposDoTreemap,
                caminho: [...gruposDoTreemap, ...rotuloProdutos],
                onSelecionarGrupo: (grupo) => mudarFiltros({ grupo: [grupo], produtos: [] }),
                onLimparGrupo: () => mudarFiltros({ grupo: [], produtos: [] }),
            }}
            catalogo={catalogo}
            modoCodigo={modoCodigo}
            ncmsPorSh4={ncmsPorSh4}
        >
            {children}
        </BalancaComercialView>
    )
}
