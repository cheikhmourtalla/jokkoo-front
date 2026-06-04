import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { Product } from "../types/index";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Props = {
  products: Product[];
};

export default function StockChart({ products }: Props) {
  const labels = products.map((product) => product.name);
  const values = products.map((product) => product.quantity);

  const data = {
    labels,
    datasets: [
      {
        label: "Quantité en stock",
        data: values,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: true },
    },
  };

  return <Bar data={data} options={options} />;
}