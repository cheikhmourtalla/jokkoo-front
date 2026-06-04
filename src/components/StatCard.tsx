type Props = {
  title: string;
  value: any;
};

export default function StatCard({ title, value }: Props) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <p className="text-gray-500 text-sm">{title}</p>
      <h3 className="text-2xl font-bold mt-2">{value}</h3>
    </div>
  );
}