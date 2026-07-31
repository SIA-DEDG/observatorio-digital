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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

const EXPORT_COLOR = '#2563eb';
const IMPORT_COLOR = '#f59e0b';

const DEFAULT_LABELS = ['2020', '2021', '2022', '2023', '2024', '2025'];

const DEFAULT_CITIES = [
  {
    name: 'Município',
    exports: [10, 26, 45, 30, 50, 31],
    imports: [52, 17, 32, 51, 28, 53],
  },
];

const options = {
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
      grid: { color: '#e5e7eb' },
      ticks: {
        color: '#6b7280',
        callback: (value) => moedaCompacta.format(value),
      },
      border: { display: false },
    },
    x: {
      grid: { display: false },
      ticks: { color: '#6b7280' },
      border: { display: false },
    },
  },
};

function CityChart({ labels, city, height, period }) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Valor de Exportação',
        data: city.exports,
        borderColor: EXPORT_COLOR,
        backgroundColor: EXPORT_COLOR,
        pointRadius: 5,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'Valor de Importação',
        data: city.imports,
        borderColor: IMPORT_COLOR,
        backgroundColor: IMPORT_COLOR,
        pointRadius: 5,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="flex w-full flex-col gap-3 bg-white p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[18px] font-bold text-black">
          Histórico de Importação x Exportação
        </h2>
        <p className="text-[14px] text-black">
          Histórico de exportação e importação de {city.name} no período de {period}.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-[17px]">
        <div className="flex items-center gap-2">
          <span className="size-[10px] shrink-0 rounded-full" style={{ backgroundColor: EXPORT_COLOR }} />
          <span className="text-[14px] text-black">Valor de Exportação</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-[10px] shrink-0 rounded-full" style={{ backgroundColor: IMPORT_COLOR }} />
          <span className="text-[14px] text-black">Valor de Importação</span>
        </div>
      </div>

      <div className="relative w-full" style={{ height }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

export default function ChartLine({ labels = DEFAULT_LABELS, cities = DEFAULT_CITIES, period = 'todo o período', empilhado = false }) {
  const visible = cities.slice(0, 5);
  const single = visible.length <= 1;
  const height = single ? 300 : empilhado ? 220 : 150;

  return (
    <div className={`grid gap-6 ${single || empilhado ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
      {visible.map((city) => (
        <CityChart key={city.name} labels={labels} city={city} height={height} period={period} />
      ))}
    </div>
  );
}
