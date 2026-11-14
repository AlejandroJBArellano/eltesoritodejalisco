import { describe, it, expect } from "vitest";
import { aggregateOptionSales, channelOf } from "../optionReports";

describe("aggregateOptionSales", () => {
  it("sums units × row quantity, revenue and channel breakdown", () => {
    const rows = aggregateOptionSales([
      {
        id: "o1",
        source: "POS",
        order_items: [
          {
            menu_item_id: "mi-mixtos",
            quantity: 2,
            menu_items: { name: "Tacos Mixtos" },
            order_item_options: [
              { option_id: "pastor", group_name: "Tacos", option_name: "Pastor", quantity: 2, unit_price: 10 },
              { option_id: "birria", group_name: "Tacos", option_name: "Birria", quantity: 1, unit_price: 0 },
            ],
          },
        ],
      },
      {
        id: "o2",
        source: "PICKUP_APP",
        order_items: [
          {
            menu_item_id: "mi-mixtos",
            quantity: 1,
            menu_items: [{ name: "Tacos Mixtos" }],
            order_item_options: [
              { option_id: "pastor", group_name: "Tacos", option_name: "Pastor", quantity: 3, unit_price: 10 },
            ],
          },
          // Renglón sin personalización: se ignora
          { menu_item_id: "mi-coca", quantity: 4, order_item_options: [] },
        ],
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      key: "mi-mixtos|pastor",
      productName: "Tacos Mixtos",
      optionName: "Pastor",
      units: 7,
      revenue: 70,
      orders: 2,
      byChannel: { POS: { units: 4, revenue: 40 }, PICKUP: { units: 3, revenue: 30 } },
    });
    expect(rows[1]).toMatchObject({ optionName: "Birria", units: 2, revenue: 0, orders: 1 });
  });

  it("keeps deleted options (option_id null) grouped by name", () => {
    const rows = aggregateOptionSales([
      {
        id: "o1",
        source: null,
        order_items: [
          {
            menu_item_id: "m",
            quantity: 1,
            order_item_options: [
              { option_id: null, group_name: "G", option_name: "Viejo", quantity: 1, unit_price: 5 },
              { option_id: null, group_name: "G", option_name: "Viejo", quantity: 1, unit_price: 5 },
            ],
          },
        ],
      },
    ]);
    expect(rows).toEqual([
      expect.objectContaining({ key: "m|G|Viejo", productName: "Producto", units: 2, revenue: 10 }),
    ]);
  });

  it("maps sources to channels", () => {
    expect(channelOf("PICKUP_APP")).toBe("PICKUP");
    expect(channelOf("POS")).toBe("POS");
    expect(channelOf("Uber")).toBe("POS");
  });
});
