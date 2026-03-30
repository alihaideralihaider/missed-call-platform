export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_sold_out?: boolean;
};

export type CartState = {
  restaurantSlug: string | null;
  items: CartItem[];
};

type MenuSyncItem = {
  id: string;
  name: string;
  price: number;
  is_sold_out?: boolean;
};

const STORAGE_KEY = "mcaab_cart";
const CART_UPDATED_EVENT = "cart_updated";

function emptyCart(): CartState {
  return {
    restaurantSlug: null,
    items: [],
  };
}

function emitCartUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

function sanitizeCartItem(item: unknown): CartItem | null {
  if (!item || typeof item !== "object") return null;

  const raw = item as Partial<CartItem>;
  const id = String(raw.id ?? "").trim();
  const name = String(raw.name ?? "").trim();
  const price = Number(raw.price);
  const quantity = Number(raw.quantity);
  const is_sold_out = Boolean(raw.is_sold_out);

  if (!id || !name) return null;
  if (!Number.isFinite(price) || price < 0) return null;
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  return {
    id,
    name,
    price,
    quantity: Math.floor(quantity),
    is_sold_out,
  };
}

export function getCart(): CartState {
  if (typeof window === "undefined") return emptyCart();

  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return emptyCart();

  try {
    const parsed = JSON.parse(data);

    const restaurantSlug =
      typeof parsed?.restaurantSlug === "string" && parsed.restaurantSlug.trim()
        ? parsed.restaurantSlug.trim().toLowerCase()
        : null;

    const items = Array.isArray(parsed?.items)
      ? parsed.items
          .map(sanitizeCartItem)
          .filter((item: CartItem | null): item is CartItem => item !== null)
      : [];

    return {
      restaurantSlug,
      items,
    };
  } catch {
    return emptyCart();
  }
}

export function saveCart(cart: CartState) {
  if (typeof window === "undefined") return;

  const normalizedCart: CartState = {
    restaurantSlug:
      typeof cart.restaurantSlug === "string" && cart.restaurantSlug.trim()
        ? cart.restaurantSlug.trim().toLowerCase()
        : null,
    items: Array.isArray(cart.items)
      ? cart.items
          .map(sanitizeCartItem)
          .filter((item): item is CartItem => item !== null)
      : [],
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedCart));
  emitCartUpdated();
}

export function addToCart(
  restaurantSlug: string,
  item: {
    id: string;
    name: string;
    price: number;
    is_sold_out?: boolean;
  }
) {
  const normalizedRestaurantSlug = String(restaurantSlug ?? "")
    .trim()
    .toLowerCase();

  if (!normalizedRestaurantSlug) return;

  const normalizedItem = sanitizeCartItem({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: 1,
    is_sold_out: item.is_sold_out,
  });

  if (!normalizedItem) return;

  const cart = getCart();

  if (
    cart.restaurantSlug &&
    cart.restaurantSlug !== normalizedRestaurantSlug
  ) {
    saveCart({
      restaurantSlug: normalizedRestaurantSlug,
      items: [normalizedItem],
    });
    return;
  }

  const items = [...cart.items];
  const existing = items.find((i) => i.id === normalizedItem.id);

  if (existing) {
    existing.quantity += 1;
    existing.name = normalizedItem.name;
    existing.price = normalizedItem.price;
    existing.is_sold_out = normalizedItem.is_sold_out;
  } else {
    items.push(normalizedItem);
  }

  saveCart({
    restaurantSlug: normalizedRestaurantSlug,
    items,
  });
}

export function saveCartItems(items: CartItem[]) {
  const cart = getCart();

  saveCart({
    restaurantSlug: cart.restaurantSlug,
    items,
  });
}

export function updateCartItemQuantity(id: string, quantity: number) {
  const cart = getCart();
  const normalizedId = String(id ?? "").trim();

  if (!normalizedId) return;

  const nextItems = cart.items
    .map((item) =>
      item.id === normalizedId
        ? { ...item, quantity: Math.floor(quantity) }
        : item
    )
    .filter((item) => item.quantity > 0);

  saveCart({
    restaurantSlug: nextItems.length > 0 ? cart.restaurantSlug : null,
    items: nextItems,
  });
}

export function removeFromCart(id: string) {
  const cart = getCart();
  const normalizedId = String(id ?? "").trim();

  if (!normalizedId) return;

  const nextItems = cart.items.filter((item) => item.id !== normalizedId);

  saveCart({
    restaurantSlug: nextItems.length > 0 ? cart.restaurantSlug : null,
    items: nextItems,
  });
}

export function cartTotal(): number {
  const cart = getCart();
  return cart.items.reduce((t, i) => t + i.price * i.quantity, 0);
}

export function cartCount(): number {
  const cart = getCart();
  return cart.items.reduce((t, i) => t + i.quantity, 0);
}

export function clearCart() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  emitCartUpdated();
}

export function getCartItems(): CartItem[] {
  return getCart().items;
}

export function getCartRestaurantSlug(): string | null {
  return getCart().restaurantSlug;
}

export function subscribeToCartUpdates(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(CART_UPDATED_EVENT, callback);

  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, callback);
  };
}

export function syncCartWithMenu(
  restaurantSlug: string,
  menuItems: MenuSyncItem[]
) {
  const normalizedRestaurantSlug = String(restaurantSlug ?? "")
    .trim()
    .toLowerCase();

  if (!normalizedRestaurantSlug) return;

  const cart = getCart();

  if (
    !cart.restaurantSlug ||
    cart.restaurantSlug !== normalizedRestaurantSlug ||
    cart.items.length === 0
  ) {
    return;
  }

  const menuMap = new Map(
    menuItems
      .filter((item) => item && item.id)
      .map((item) => [
        String(item.id).trim(),
        {
          id: String(item.id).trim(),
          name: String(item.name ?? "").trim(),
          price: Number(item.price ?? 0),
          is_sold_out: Boolean(item.is_sold_out),
        },
      ])
  );

  const nextItems = cart.items
    .map((cartItem) => {
      const latest = menuMap.get(cartItem.id);

      if (!latest) {
        return null;
      }

      return sanitizeCartItem({
        id: latest.id,
        name: latest.name,
        price: latest.price,
        quantity: cartItem.quantity,
        is_sold_out: latest.is_sold_out,
      });
    })
    .filter((item): item is CartItem => item !== null);

  const changed =
    nextItems.length !== cart.items.length ||
    nextItems.some((item, index) => {
      const prev = cart.items[index];
      return (
        !prev ||
        item.id !== prev.id ||
        item.name !== prev.name ||
        item.price !== prev.price ||
        item.quantity !== prev.quantity ||
        Boolean(item.is_sold_out) !== Boolean(prev.is_sold_out)
      );
    });

  if (!changed) return;

  saveCart({
    restaurantSlug: nextItems.length > 0 ? cart.restaurantSlug : null,
    items: nextItems,
  });
}