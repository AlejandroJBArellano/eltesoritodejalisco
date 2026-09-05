import { describe, it, expect } from "vitest";
import {
  getServiceType,
  formatServiceLabel,
  formatServiceTicket,
  resolveTableValue,
} from "../serviceType";

describe("serviceType utilities", () => {
  describe("getServiceType", () => {
    it("should return para_llevar when table is empty or null or undefined", () => {
      expect(getServiceType(null)).toBe("para_llevar");
      expect(getServiceType(undefined)).toBe("para_llevar");
      expect(getServiceType("")).toBe("para_llevar");
      expect(getServiceType("   ")).toBe("para_llevar");
    });

    it("should return para_llevar for takeout values", () => {
      expect(getServiceType("Para Llevar")).toBe("para_llevar");
      expect(getServiceType("para llevar")).toBe("para_llevar");
      expect(getServiceType("takeout")).toBe("para_llevar");
      expect(getServiceType("pickup")).toBe("para_llevar");
    });

    it("should return domicilio for delivery values", () => {
      expect(getServiceType("Domicilio")).toBe("domicilio");
      expect(getServiceType("domicilio")).toBe("domicilio");
      expect(getServiceType("A domicilio")).toBe("domicilio");
      expect(getServiceType("a domicilio")).toBe("domicilio");
    });

    it("should return comedor for table or dine-in values", () => {
      expect(getServiceType("Comedor")).toBe("comedor");
      expect(getServiceType("Mesa 1")).toBe("comedor");
      expect(getServiceType("4")).toBe("comedor");
      expect(getServiceType("Terraza")).toBe("comedor");
      expect(getServiceType("Comer Aquí")).toBe("comedor");
    });
  });

  describe("formatServiceLabel", () => {
    it("should format empty values as Para Llevar", () => {
      expect(formatServiceLabel(null)).toBe("Para Llevar");
      expect(formatServiceLabel(undefined)).toBe("Para Llevar");
      expect(formatServiceLabel("")).toBe("Para Llevar");
    });

    it("should format delivery labels", () => {
      expect(formatServiceLabel("Domicilio")).toBe("A Domicilio");
      expect(formatServiceLabel("a domicilio")).toBe("A Domicilio");
    });

    it("should format takeout labels", () => {
      expect(formatServiceLabel("Para Llevar")).toBe("Para Llevar");
      expect(formatServiceLabel("takeout")).toBe("Para Llevar");
      expect(formatServiceLabel("pickup")).toBe("Para Llevar");
    });

    it("should format dining room labels", () => {
      expect(formatServiceLabel("Comedor")).toBe("Comedor");
      expect(formatServiceLabel("Comer Aquí")).toBe("Comedor");
      expect(formatServiceLabel("Mesa 3")).toBe("Mesa 3");
      expect(formatServiceLabel("4")).toBe("Mesa 4");
      expect(formatServiceLabel("Terraza 2")).toBe("Mesa Terraza 2");
    });
  });

  describe("formatServiceTicket", () => {
    it("should format empty values as PARA LLEVAR", () => {
      expect(formatServiceTicket(null)).toBe("PARA LLEVAR");
      expect(formatServiceTicket(undefined)).toBe("PARA LLEVAR");
      expect(formatServiceTicket("")).toBe("PARA LLEVAR");
    });

    it("should format delivery tickets", () => {
      expect(formatServiceTicket("Domicilio")).toBe("A DOMICILIO");
      expect(formatServiceTicket("a domicilio")).toBe("A DOMICILIO");
    });

    it("should format takeout tickets", () => {
      expect(formatServiceTicket("Para Llevar")).toBe("PARA LLEVAR");
      expect(formatServiceTicket("takeout")).toBe("PARA LLEVAR");
      expect(formatServiceTicket("pickup")).toBe("PARA LLEVAR");
    });

    it("should format dining room tickets", () => {
      expect(formatServiceTicket("Comedor")).toBe("COMEDOR");
      expect(formatServiceTicket("Comer Aquí")).toBe("COMEDOR");
      expect(formatServiceTicket("Mesa 5")).toBe("MESA 5");
      expect(formatServiceTicket("5")).toBe("MESA 5");
    });
  });

  describe("resolveTableValue", () => {
    it("should resolve PARA_LLEVAR to 'Para Llevar'", () => {
      expect(resolveTableValue("PARA_LLEVAR")).toBe("Para Llevar");
      expect(resolveTableValue("PARA_LLEVAR", "4")).toBe("Para Llevar");
    });

    it("should resolve DOMICILIO to 'Domicilio'", () => {
      expect(resolveTableValue("DOMICILIO")).toBe("Domicilio");
      expect(resolveTableValue("DOMICILIO", "calle 5")).toBe("Domicilio");
    });

    it("should resolve COMEDOR with and without mesa input", () => {
      expect(resolveTableValue("COMEDOR")).toBe("Comedor");
      expect(resolveTableValue("COMEDOR", "")).toBe("Comedor");
      expect(resolveTableValue("COMEDOR", "   ")).toBe("Comedor");
      expect(resolveTableValue("COMEDOR", "2")).toBe("Mesa 2");
      expect(resolveTableValue("COMEDOR", "Mesa 4")).toBe("Mesa 4");
      expect(resolveTableValue("COMEDOR", "mesa 7")).toBe("mesa 7");
      expect(resolveTableValue("COMEDOR", "Terraza 1")).toBe("Mesa Terraza 1");
    });
  });
});
