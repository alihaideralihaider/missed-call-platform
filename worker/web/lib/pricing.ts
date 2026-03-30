export function calculateTotals(
  items: { price: number; quantity: number }[],
  taxRate: number,
  taxMode: "exclusive" | "inclusive" | "none"
) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  let tax = 0;
  let total = subtotal;

  if (taxMode === "exclusive") {
    tax = subtotal * taxRate;
    total = subtotal + tax;
  } else if (taxMode === "inclusive") {
    tax = subtotal - subtotal / (1 + taxRate);
  }

  return {
    subtotal,
    tax,
    total,
  };
}