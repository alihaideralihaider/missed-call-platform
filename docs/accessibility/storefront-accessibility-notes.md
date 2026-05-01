# Storefront Accessibility Notes

## Scope Checked

- `app/r/[slug]/page.tsx`
- `components/storefront/RestaurantMenuClient.tsx`
- `components/storefront/StickyCartBar.tsx`
- `app/r/[slug]/cart/page.tsx`
- `app/r/[slug]/checkout/page.tsx`
- `app/r/[slug]/confirmation/page.tsx`
- `app/r/[slug]/success/page.tsx`

## Improvements Made

- Added clearer accessible labels for add-to-order, remove, quantity, checkout, and place-order actions.
- Added visible focus styles to key links, buttons, checkout fields, pickup controls, and cart actions.
- Added polite live regions for cart/order summary updates and order confirmation status updates.
- Improved checkout form semantics with required attributes, fieldset/legend for pickup time, and an associated error alert.
- Improved modifier dialog semantics with dialog labeling and clearer close/add button names.
- Kept menu item image alt text tied to item names where images represent menu content.
- Preserved existing ordering behavior and visual structure.

## Known Remaining Gaps

- Menu item cards still use card-level click handling in a few places. A future pass should convert those to a fully semantic button or card-action pattern.
- The modifier dialog does not yet implement a full focus trap.
- Automated accessibility tooling such as axe/Playwright has not been added yet.
- Real restaurant imagery and custom brand colors should be spot-checked for contrast during onboarding.

## Future Recommendations

- Add an automated accessibility smoke test for menu, cart, checkout, and confirmation routes.
- Add keyboard-only regression checks for item customization, quantity changes, checkout, and order cancellation.
- Add field-level checkout error messages if the form validation becomes more complex.
- Review screen reader announcements after real order status polling is enabled in production.
