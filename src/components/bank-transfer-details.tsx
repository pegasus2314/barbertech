import QRCode from "qrcode";
import { getSubscriptionBankDetails, bankDetailsToText } from "@/lib/subscription/bank-details";

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="text-right text-sm font-semibold text-neutral-900">{value}</span>
    </div>
  );
}

export async function BankTransferDetails({
  note = "Escanea el código para copiar estos datos en tu teléfono, o transfiere directamente con la información de al lado. Luego registra tu pago abajo.",
}: {
  note?: string;
}) {
  const details = getSubscriptionBankDetails();
  if (!details) return null;

  const qrSvg = await QRCode.toString(bankDetailsToText(details), {
    type: "svg",
    margin: 1,
    width: 144,
    color: { dark: "#171717", light: "#ffffff" },
  });

  return (
    <div className="rounded-2xl border border-[#e7e3da] bg-[#f7f6f2] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9d7837]">Datos para transferir</p>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className="mx-auto flex h-[152px] w-[152px] shrink-0 items-center justify-center rounded-xl border border-[#e7e3da] bg-white p-1 sm:mx-0"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <div className="min-w-0 flex-1 divide-y divide-[#eeeae2]">
          <Row label="Banco" value={details.bankName} />
          <Row label="Tipo de cuenta" value={details.accountType} />
          <Row label="Titular" value={details.holderName} />
          <Row label="Cédula" value={details.holderId} />
          <Row label="Número de cuenta" value={details.accountNumber} />
          <Row label="Cuenta estándar" value={details.iban} />
          <Row label="SWIFT" value={details.swift} />
        </div>
      </div>
      <p className="mt-3 text-xs text-neutral-500">{note}</p>
    </div>
  );
}
