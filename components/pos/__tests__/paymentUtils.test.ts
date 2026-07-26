import { describe, it, expect } from "vitest";
import {
  getOrderTipAmount,
  getOrderPaymentMethods,
  getPaymentMethodLabel,
  getOrderPaymentLabel,
} from "../paymentUtils";
import { OrderWithDetails, PaymentMethod } from "@/types";

describe("paymentUtils", () => {
  describe("getOrderTipAmount", () => {
    it("should return 0 if order or payments are null/empty", () => {
      expect(getOrderTipAmount(null)).toBe(0);
      expect(getOrderTipAmount(undefined)).toBe(0);
      expect(getOrderTipAmount({ payments: [] } as unknown as OrderWithDetails)).toBe(0);
    });

    it("should sum tip amounts from all payments", () => {
      const order = {
        payments: [
          { tipAmount: 15 },
          { tipAmount: 10 },
          { tipAmount: 0 },
        ],
      } as unknown as OrderWithDetails;

      expect(getOrderTipAmount(order)).toBe(25);
    });
  });

  describe("getOrderPaymentMethods", () => {
    it("should return unique payment methods present in payments", () => {
      const order = {
        payments: [
          { method: PaymentMethod.CASH },
          { method: PaymentMethod.CARD },
          { method: PaymentMethod.CASH },
        ],
      } as unknown as OrderWithDetails;

      expect(getOrderPaymentMethods(order)).toEqual([PaymentMethod.CASH, PaymentMethod.CARD]);
    });
  });

  describe("getPaymentMethodLabel", () => {
    it("should translate payment method enums to Spanish labels", () => {
      expect(getPaymentMethodLabel(PaymentMethod.CASH)).toBe("Efectivo");
      expect(getPaymentMethodLabel(PaymentMethod.CARD)).toBe("Tarjeta");
      expect(getPaymentMethodLabel(PaymentMethod.TRANSFER)).toBe("Transferencia");
      expect(getPaymentMethodLabel(PaymentMethod.OTHER)).toBe("Otro");
    });
  });

  describe("getOrderPaymentLabel", () => {
    it("should return N/A if no payments exist", () => {
      expect(getOrderPaymentLabel(null)).toBe("N/A");
    });

    it("should return single label if only one payment method was used", () => {
      const order = {
        payments: [{ method: PaymentMethod.CARD }],
      } as unknown as OrderWithDetails;
      expect(getOrderPaymentLabel(order)).toBe("Tarjeta");
    });

    it("should format split payments into Mixto label", () => {
      const order = {
        payments: [
          { method: PaymentMethod.CASH },
          { method: PaymentMethod.CARD },
        ],
      } as unknown as OrderWithDetails;
      expect(getOrderPaymentLabel(order)).toBe("Mixto (Efectivo + Tarjeta)");
    });
  });
});
