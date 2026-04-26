export type CartItem = {
  lineId?: string;
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_sold_out?: boolean;
  modifiers?: CartModifierSelection[];
};

export type CartModifierSelection = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
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

function sanitizeModifierSelection(
  modifier: unknown
): CartModifierSelection | null {
  if (!modifier || typeof modifier !== "object") return null;

  const raw = modifier as Partial<CartModifierSelection>;
  const groupId = String(raw.groupId ?? "").trim();
  const groupName = String(raw.groupName ?? "").trim();
  const optionId = String(raw.optionId ?? "").trim();
  const optionName = String(raw.optionName ?? "").trim();
  const price = Number(raw.price ?? 0);

  if (!groupId || !groupName || !optionId || !optionName) return null;
  if (!Number.isFinite(price)) return null;

  return {
    groupId,
    groupName,
    optionId,
    optionName,
    price,
  };
}

function sanitizeModifierSelections(
  modifiers: unknown
): CartModifierSelection[] {
  if (!Array.isArray(modifiers)) return [];

  return modifiers
    .map(sanitizeModifierSelection)
    .filter(
      (modifier): modifier is CartModifierSelection => modifier !== null
    )
    .sort((a, b) =>
      `${a.groupId}:${a.optionId}`.localeCompare(`${b.groupId}:${b.optionId}`)
    );
}

function buildCartLineId(item: {
  id: string;
  modifiers?: CartModifierSelection[];
}) {
  const normalizedId = String(item.id ?? "").trim();
  const modifierKey = (item.modifiers || [])
    .map(
      (modifier) =>
        `${modifier.groupId}:${modifier.optionId}:${Number(modifier.price || 0).toFixed(2)}`
    )
    .sort()
    .join("|");

  return modifierKey ? `${normalizedId}::${modifierKey}` : normalizedId;
}

function sanitizeCartItem(item: unknown): CartItem | null {
  if (!item || typeof item !== "object") return null;

  const raw = item as Partial<CartItem>;
  const id = String(raw.id ?? "").trim();
  const name = String(raw.name ?? "").trim();
  const price = Number(raw.price);
  const quantity = Number(raw.quantity);
  const is_sold_out = Boolean(raw.is_sold_out);
  const modifiers = sanitizeModifierSelections(raw.modifiers);

  if (!id || !name) return null;
  if (!Number.isFinite(price) || price < 0) return null;
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  const lineId = String(raw.lineId ?? "").trim() || buildCartLineId({ id, modifiers });

  return {
    lineId,
    id,
    name,
    price,
    quantity: Math.floor(quantity),
    is_sold_out,
    modifiers,
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

  const normalizedItems = Array.isArray(cart.items)
    ? cart.items
        .map(sanitizeCartItem)
        .filter((item): item is CartItem => item !== null)
    : [];

  const normalizedCart: CartState = {
    restaurantSlug:
      typeof cart.restaurantSlug === "string" && cart.restaurantSlug.trim()
        ? cart.restaurantSlug.trim().toLowerCase()
        : null,
    items: normalizedItems,
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
    modifiers?: CartModifierSelection[];
  }
) {
  const normalizedRestaurantSlug = String(restaurantSlug ?? "")
    .trim()
    .toLowerCase();

  if (!normalizedRestaurantSlug) return;

  console.log("ADD_TO_CART_INPUT", item);

  const normalizedItem = sanitizeCartItem({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: 1,
    is_sold_out: item.is_sold_out,
    modifiers: sanitizeModifierSelections(item.modifiers),
  });

  if (!normalizedItem) return;

  console.log("ADD_TO_CART_NORMALIZED", normalizedItem);

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
  const existing = items.find((i) => i.lineId === normalizedItem.lineId);

  if (existing) {
    existing.quantity += 1;
    existing.name = normalizedItem.name;
    existing.price = normalizedItem.price;
    existing.is_sold_out = normalizedItem.is_sold_out;
    existing.modifiers = sanitizeModifierSelections(normalizedItem.modifiers);
    existing.lineId = buildCartLineId({
      id: normalizedItem.id,
      modifiers: normalizedItem.modifiers,
    });
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
      (item.lineId || item.id) === normalizedId
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

  const nextItems = cart.items.filter(
    (item) => (item.lineId || item.id) !== normalizedId
  );

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
  const items = getCart().items.map((item) => ({
    ...item,
    modifiers: sanitizeModifierSelections(item.modifiers),
    lineId: buildCartLineId({
      id: item.id,
      modifiers: item.modifiers,
    }),
  }));

  console.log("GET_CART_ITEMS", items);

  return items;
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
        lineId: cartItem.lineId,
        id: latest.id,
        name: latest.name,
        price:
          Array.isArray(cartItem.modifiers) && cartItem.modifiers.length > 0
            ? cartItem.price
            : latest.price,
        quantity: cartItem.quantity,
        is_sold_out: latest.is_sold_out,
        modifiers: cartItem.modifiers,
      });
    })
    .filter((item): item is CartItem => item !== null);

  const changed =
    nextItems.length !== cart.items.length ||
    nextItems.some((item, index) => {
      const prev = cart.items[index];
      return (
        !prev ||
        item.lineId !== prev.lineId ||
        item.id !== prev.id ||
        item.name !== prev.name ||
        item.price !== prev.price ||
        item.quantity !== prev.quantity ||
        Boolean(item.is_sold_out) !== Boolean(prev.is_sold_out) ||
        JSON.stringify(item.modifiers || []) !== JSON.stringify(prev.modifiers || [])
      );
    });

  if (!changed) return;

  saveCart({
    restaurantSlug: nextItems.length > 0 ? cart.restaurantSlug : null,
    items: nextItems,
  });
}
