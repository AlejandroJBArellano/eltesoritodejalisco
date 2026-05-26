import { OrderWithDetails, PaymentMethod } from "@/types";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Efectivo",
  [PaymentMethod.CARD]: "Tarjeta",
  [PaymentMethod.TRANSFER]: "Transferencia",
  [PaymentMethod.OTHER]: "Otro",
};

export const getOrderTipAmount = (order?: OrderWithDetails | null) =>
  order?.payments?.reduce((sum, payment) => sum + (payment.tipAmount || 0), 0) ||
  0;

export const getOrderPaymentMethods = (order?: OrderWithDetails | null) =>
  Array.from(new Set(order?.payments?.map((payment) => payment.method) || []));

export const getPaymentMethodLabel = (method: PaymentMethod | string) =>
  PAYMENT_METHOD_LABELS[method as PaymentMethod] || method;

export const getOrderPaymentLabel = (order?: OrderWithDetails | null) => {
  const methods = getOrderPaymentMethods(order);

  if (!methods.length) return "N/A";
  if (methods.length === 1) return getPaymentMethodLabel(methods[0]);

  return `Mixto (${methods.map(getPaymentMethodLabel).join(" + ")})`;
};
