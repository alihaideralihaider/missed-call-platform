import assert from "node:assert/strict";
import {
  evaluateRestaurantHours,
  getDemoRestaurantPickupHours,
} from "./restaurant-hours.ts";

const timeZone = "America/New_York";

function weeklyHours(openTime, closeTime) {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    day_of_week: dayOfWeek,
    open_time: openTime,
    close_time: closeTime,
    is_closed: false,
  }));
}

function evaluate(hours, isoNow, options = {}) {
  return evaluateRestaurantHours(hours, timeZone, new Date(isoNow), {
    asapPrepMinutes: 20,
    pickupSlotIntervalMinutes: 15,
    maxScheduleDaysAhead: 7,
    ...options,
  });
}

{
  const result = evaluate(getDemoRestaurantPickupHours(), "2026-05-18T16:00:00Z");
  assert.equal(result.isOpenNow, true);
  assert.equal(result.availableScheduledSlots.length > 0, true);
  assert.equal(result.pickupOptions.length > 0, true);
}

{
  const result = evaluate(weeklyHours("00:00:00", "23:59:00"), "2026-05-18T03:59:30Z");
  assert.equal(result.isOpenNow, false);
  assert.equal(result.availableScheduledSlots.length > 0, true);
  assert.match(result.statusText ?? "", /Closed now/);
  assert.match(result.nextOpenText ?? "", /Opens tomorrow at 12:00 AM/);
  assert.equal(
    new Date(result.availableScheduledSlots[0].pickupAt).getTime() >=
      new Date("2026-05-18T04:00:00Z").getTime(),
    true
  );
}

{
  const result = evaluate(weeklyHours("23:59:00", "23:58:00"), "2026-05-19T03:58:30Z");
  assert.equal(result.isOpenNow, false);
  assert.equal(result.availableScheduledSlots.length > 0, true);
  assert.match(result.nextOpenText ?? "", /Opens at 11:59 PM today/);
  assert.equal(
    new Date(result.availableScheduledSlots[0].pickupAt).getTime() >
      new Date("2026-05-19T03:59:00Z").getTime(),
    true
  );
}

{
  const result = evaluate(weeklyHours("20:00:00", "02:00:00"), "2026-05-18T05:30:00Z");
  assert.equal(result.isOpenNow, true);
  assert.equal(result.availableScheduledSlots.length > 0, true);
}

{
  const result = evaluate(weeklyHours("00:01:00", "23:59:00"), "2026-05-18T04:00:30Z");
  assert.equal(result.isOpenNow, false);
  assert.equal(result.availableScheduledSlots.length > 0, true);
  assert.match(result.nextOpenText ?? "", /Opens at 12:01 AM today/);
}

{
  const result = evaluate(weeklyHours("00:00:00", "23:59:00"), "2026-03-08T06:30:00Z");
  assert.equal(result.availableScheduledSlots.length > 0, true);
}

console.log("restaurant-hours tests passed");

