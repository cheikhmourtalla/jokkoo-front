type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export const PAYMENT_METHODS = [
  { value: "CASH",         label: "💵 Espèces" },
  { value: "WAVE",         label: "🔵 Wave" },
  { value: "ORANGE_MONEY", label: "🟠 Orange Money" },
  { value: "FREE_MONEY",   label: "🟣 Free Money" },
  { value: "BANK",         label: "🏦 Virement bancaire" },
  { value: "OTHER",        label: "📱 Autre" },
];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH:         "💵 Espèces",
  WAVE:         "🔵 Wave",
  ORANGE_MONEY: "🟠 Orange Money",
  FREE_MONEY:   "🟣 Free Money",
  BANK:         "🏦 Virement",
  OTHER:        "📱 Autre",
};

export default function PaymentMethodSelect({ value, onChange, className = "" }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 ${className}`}
    >
      {PAYMENT_METHODS.map((m) => (
        <option key={m.value} value={m.value}>{m.label}</option>
      ))}
    </select>
  );
}