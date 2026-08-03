import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js';

import { moedaCompacta } from '../util/formats';
import { usePaleta } from '../tema/paletas';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

// Chart.js pinta por objeto de opções, não por CSS: precisa ser refeito a cada tema
const montarOpcoes = (paleta) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${moedaCompacta.format(ctx.parsed.y)}`,
      },
    },
  },
  scales: {
    y: {
      grid: { color: paleta.grade },
      ticks: {
        color: paleta.ticks,
        callback: (value) => moedaCompacta.format(value),
      },
      border: { display: false },
    },
    x: {
      grid: { display: false },
      ticks: { color: paleta.ticks },
      border: { display: false },
    },
  },
});

function CityChart({ labels, city, height, period, paleta, opcoes }) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Valor de Exportação',
        data: city.exports,
        borderColor: paleta.exportacao,
        backgroundColor: paleta.exportacao,
        pointRadius: 5,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'Valor de Importação',
        data: city.imports,
        borderColor: paleta.importacao,
        backgroundColor: paleta.importacao,
        pointRadius: 5,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="flex w-full flex-col gap-3 bg-superficie-1 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[18px] font-bold text-texto-1">
          Histórico de Importação x Exportação
        </h2>
        <p className="text-[14px] text-texto-1">
          Histórico de exportação e importação de {city.name} no período de {period}.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-[17px]">
        <div className="flex items-center gap-2">
          <span className="size-[10px] shrink-0 rounded-full" style={{ backgroundColor: paleta.exportacao }} />
          <span className="text-[14px] text-texto-1">Valor de Exportação</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-[10px] shrink-0 rounded-full" style={{ backgroundColor: paleta.importacao }} />
          <span className="text-[14px] text-texto-1">Valor de Importação</span>
        </div>
      </div>

      <div className="relative w-full" style={{ height }}>
        <Line data={data} options={opcoes} />
      </div>
    </div>
  );
}

export default function ChartLine({ labels = [], cities = [], period = 'todo o período', empilhado = false }) {
  const { grafico } = usePaleta();
  const opcoes = useMemo(() => montarOpcoes(grafico), [grafico]);

  const visible = cities.slice(0, 5);
  const single = visible.length <= 1;
  const height = single ? 300 : empilhado ? 220 : 150;

  // Sem dados não há gráfico: os antigos defaults eram números fictícios que
  // passariam por reais se a agregação viesse vazia.
  if (visible.length === 0) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center bg-superficie-1 p-6 text-[14px] text-texto-3">
        Sem dados para o período e os filtros selecionados.
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${single || empilhado ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
      {visible.map((city) => (
        <CityChart
          key={city.name}
          labels={labels}
          city={city}
          height={height}
          period={period}
          paleta={grafico}
          opcoes={opcoes}
        />
      ))}
    </div>
  );
}
