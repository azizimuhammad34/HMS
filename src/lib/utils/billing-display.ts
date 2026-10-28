export function formatInvoiceStatus(status: string): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "issued":
      return "Issued";
    case "partially_paid":
      return "Partially paid";
    case "paid":
      return "Paid";
    case "void":
      return "Void";
    default:
      return status;
  }
}

export function formatPaymentMethod(method: string): string {
  switch (method) {
    case "cash":
      return "Cash";
    case "card":
      return "Card";
    case "bank_transfer":
      return "Bank transfer";
    case "other":
      return "Other";
    default:
      return method;
  }
}

export function formatPaymentStatus(status: string): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "refunded":
      return "Refund";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function formatMoney(amount: number, currency = "PKR"): string {
  return `${currency} ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatBillingDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function outstandingAmount(
  totalAmount: number,
  amountPaid: number,
): number {
  return Math.max(0, roundMoney(totalAmount - amountPaid));
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
