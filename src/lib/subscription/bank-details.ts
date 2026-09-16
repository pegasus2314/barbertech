import "server-only";

export type BankDetails = {
  bankName: string;
  accountType: string;
  currency: string;
  holderName: string;
  holderId: string;
  accountNumber: string;
  iban: string;
  swift: string;
};

// Returns null when unconfigured so the UI can just skip the card instead
// of rendering half-empty fields.
export function getSubscriptionBankDetails(): BankDetails | null {
  const bankName = process.env.SUBSCRIPTION_BANK_NAME;
  const accountNumber = process.env.SUBSCRIPTION_BANK_ACCOUNT_NUMBER;
  if (!bankName || !accountNumber) return null;

  return {
    bankName,
    accountType: process.env.SUBSCRIPTION_BANK_ACCOUNT_TYPE ?? "",
    currency: process.env.SUBSCRIPTION_BANK_CURRENCY ?? "DOP",
    holderName: process.env.SUBSCRIPTION_BANK_HOLDER_NAME ?? "",
    holderId: process.env.SUBSCRIPTION_BANK_HOLDER_ID ?? "",
    accountNumber,
    iban: process.env.SUBSCRIPTION_BANK_IBAN ?? "",
    swift: process.env.SUBSCRIPTION_BANK_SWIFT ?? "",
  };
}

export function bankDetailsToText(details: BankDetails): string {
  const lines = [
    "BarberTech — Datos para transferencia",
    `Banco: ${details.bankName}`,
    details.accountType && `Tipo de cuenta: ${details.accountType}`,
    `Titular: ${details.holderName}`,
    details.holderId && `Cédula: ${details.holderId}`,
    `Número de cuenta: ${details.accountNumber}`,
    `Moneda: ${details.currency}`,
    details.iban && `Cuenta estándar: ${details.iban}`,
    details.swift && `SWIFT: ${details.swift}`,
  ].filter(Boolean);

  return lines.join("\n");
}
