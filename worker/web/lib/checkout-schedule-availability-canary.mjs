import assert from "node:assert/strict";
import {
  evaluateRestaurantHours,
  getDemoRestaurantPickupHours,
} from "./restaurant-hours.ts";

const checkName = "checkout-schedule-availability-canary";
const demoRestaurant = {
  slug: "demo-restaurant",
  is_active: true,
  pickup_enabled: true,
  timezone: "America/New_York",
  hours: getDemoRestaurantPickupHours(),
};

function assertDemoAvailability(nowIso) {
  assert.equal(demoRestaurant.is_active, true, "Demo Restaurant must be active.");
  assert.equal(demoRestaurant.pickup_enabled, true, "Demo Restaurant pickup must be enabled.");
  assert.equal(demoRestaurant.hours.length, 7, "Demo Restaurant must have weekly pickup hours.");

  const evaluation = evaluateRestaurantHours(
    demoRestaurant.hours,
    demoRestaurant.timezone,
    new Date(nowIso)
  );

  assert.equal(
    evaluation.availableScheduledSlots.length > 0,
    true,
    "Demo Restaurant must produce at least one future pickup slot."
  );
  assert.equal(
    evaluation.pickupOptions.length > 0,
    true,
    "Demo Restaurant schedule dropdown must not be empty."
  );
  assert.notEqual(
    evaluation.nextOpenText,
    "Closed now. No upcoming pickup hours are available.",
    "Demo Restaurant must not report no upcoming pickup hours."
  );

  return evaluation;
}

const normalHours = assertDemoAvailability("2026-05-18T16:00:00Z");
const closedWindow = assertDemoAvailability("2026-05-18T03:59:30Z");

assert.equal(closedWindow.isOpenNow, false, "Closed-window fixture should be inside the 1-minute closure.");
assert.equal(
  new Date(closedWindow.availableScheduledSlots[0].pickupAt).getTime() >=
    new Date("2026-05-18T04:00:00Z").getTime(),
  true,
  "First closed-window slot must be after reopening."
);

console.log(`${checkName}: passed`);
console.log(`normal_slots=${normalHours.availableScheduledSlots.length}`);
console.log(`closed_window_first_slot=${closedWindow.availableScheduledSlots[0].label}`);

