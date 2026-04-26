export type RestaurantHourRow = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean | null;
};

export type PickupOption = {
  value: string;
  label: string;
  pickupAt: string;
};

type TimeZoneParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
};

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

type OpenWindow = {
  openAt: Date;
  closeAt: Date;
  localDate: LocalDateParts;
  isOvernight: boolean;
};

export type RestaurantHoursEvaluation = {
  timeZone: string;
  currentDay: number;
  restaurantLocalNow: string;
  isOpenNow: boolean;
  allowsAsap: boolean;
  openingToday: boolean;
  closingSoon: boolean;
  opensAt: string | null;
  closesAt: string | null;
  closesAtText: string | null;
  nextOpenDay: string | null;
  nextOpenTime: string | null;
  nextOpenText: string | null;
  statusText: string | null;
  availableScheduledSlots: PickupOption[];
  pickupOptions: PickupOption[];
};

const DEFAULT_TIME_ZONE = "America/New_York";
const DEFAULT_ASAP_PREP_MINUTES = 20;
const DEFAULT_PICKUP_SLOT_INTERVAL_MINUTES = 15;
const DEFAULT_MAX_SCHEDULE_DAYS_AHEAD = 7;
const DEFAULT_CLOSING_SOON_THRESHOLD_MINUTES = 60;

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const WEEKDAY_INDEX_BY_SHORT_LABEL: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getSafeTimeZone(timeZone?: string | null): string {
  const candidate = String(timeZone || "").trim();

  if (!candidate) {
    return DEFAULT_TIME_ZONE;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function getTimeZoneParts(date: Date, timeZone: string): TimeZoneParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const values = Object.create(null) as Record<string, string>;

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    weekday: WEEKDAY_INDEX_BY_SHORT_LABEL[values.weekday] ?? 0,
  };
}

function formatRestaurantLocalTimestamp(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function getLocalDateParts(date: Date, timeZone: string): LocalDateParts {
  const parts = getTimeZoneParts(date, timeZone);

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

function addDaysToLocalDate(localDate: LocalDateParts, days: number): LocalDateParts {
  const date = new Date(Date.UTC(localDate.year, localDate.month - 1, localDate.day));
  date.setUTCDate(date.getUTCDate() + days);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function areSameLocalDate(a: LocalDateParts, b: LocalDateParts): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function parseTimeValue(timeValue: string | null): {
  hour: number;
  minute: number;
  second: number;
} | null {
  const value = String(timeValue || "").trim();

  if (!value) {
    return null;
  }

  const parts = value.split(":").map(Number);

  if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  return {
    hour: parts[0] ?? 0,
    minute: parts[1] ?? 0,
    second: parts[2] ?? 0,
  };
}

function getComparableLocalTimestamp(parts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}): number {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
}

function zonedDateTimeToUtc(
  localDate: LocalDateParts,
  timeValue: string,
  timeZone: string
): Date {
  const parsed = parseTimeValue(timeValue);

  if (!parsed) {
    throw new Error(`Invalid time value: ${timeValue}`);
  }

  const desiredComparable = getComparableLocalTimestamp({
    year: localDate.year,
    month: localDate.month,
    day: localDate.day,
    hour: parsed.hour,
    minute: parsed.minute,
    second: parsed.second,
  });

  let guess = desiredComparable;

  for (let i = 0; i < 3; i++) {
    const actualParts = getTimeZoneParts(new Date(guess), timeZone);
    const actualComparable = getComparableLocalTimestamp(actualParts);
    const delta = desiredComparable - actualComparable;

    if (delta === 0) {
      break;
    }

    guess += delta;
  }

  return new Date(guess);
}

function formatLocalTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getRelativeDayLabel(
  target: Date,
  now: Date,
  timeZone: string
): "today" | "tomorrow" | string {
  const targetDate = getLocalDateParts(target, timeZone);
  const nowDate = getLocalDateParts(now, timeZone);

  if (areSameLocalDate(targetDate, nowDate)) {
    return "today";
  }

  const tomorrowDate = addDaysToLocalDate(nowDate, 1);

  if (areSameLocalDate(targetDate, tomorrowDate)) {
    return "tomorrow";
  }

  return WEEKDAY_LABELS[getTimeZoneParts(target, timeZone).weekday] || "later";
}

function formatOpenText(target: Date, now: Date, timeZone: string): string {
  const dayLabel = getRelativeDayLabel(target, now, timeZone);
  const timeText = formatLocalTime(target, timeZone);

  if (dayLabel === "today") {
    return `Opens at ${timeText} today`;
  }

  if (dayLabel === "tomorrow") {
    return `Opens tomorrow at ${timeText}`;
  }

  return `Opens ${dayLabel} at ${timeText}`;
}

function formatScheduledSlotLabel(
  target: Date,
  now: Date,
  timeZone: string
): string {
  const dayLabel = getRelativeDayLabel(target, now, timeZone);
  const timeText = formatLocalTime(target, timeZone);

  if (dayLabel === "today") {
    return `Today at ${timeText}`;
  }

  if (dayLabel === "tomorrow") {
    return `Tomorrow at ${timeText}`;
  }

  return `${dayLabel} at ${timeText}`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function roundUpToNextInterval(date: Date, intervalMinutes: number): Date {
  const result = new Date(date);
  result.setSeconds(0, 0);

  const minutes = result.getUTCMinutes();
  const remainder = minutes % intervalMinutes;

  if (remainder !== 0) {
    result.setUTCMinutes(minutes + (intervalMinutes - remainder));
  }

  return result;
}

function getHoursRowForDay(
  hours: RestaurantHourRow[],
  dayOfWeek: number
): RestaurantHourRow | null {
  return (
    hours.find((row) => Number(row.day_of_week) === Number(dayOfWeek)) || null
  );
}

function getOpenWindowForLocalDate(
  hours: RestaurantHourRow[],
  localDate: LocalDateParts,
  timeZone: string
): OpenWindow | null {
  const localNoon = new Date(
    Date.UTC(localDate.year, localDate.month - 1, localDate.day, 12, 0, 0)
  );
  const dayOfWeek = getTimeZoneParts(localNoon, timeZone).weekday;
  const row = getHoursRowForDay(hours, dayOfWeek);

  if (!row || row.is_closed || !row.open_time || !row.close_time) {
    return null;
  }

  const openAt = zonedDateTimeToUtc(localDate, row.open_time, timeZone);
  const openTime = parseTimeValue(row.open_time);
  const closeTime = parseTimeValue(row.close_time);

  if (!openTime || !closeTime) {
    return null;
  }

  let closeLocalDate = localDate;
  const isOvernight =
    closeTime.hour < openTime.hour ||
    (closeTime.hour === openTime.hour &&
      closeTime.minute <= openTime.minute &&
      closeTime.second <= openTime.second);

  if (isOvernight) {
    closeLocalDate = addDaysToLocalDate(localDate, 1);
  }

  const closeAt = zonedDateTimeToUtc(closeLocalDate, row.close_time, timeZone);

  return {
    openAt,
    closeAt,
    localDate,
    isOvernight,
  };
}

function getCurrentOpenWindow(
  hours: RestaurantHourRow[],
  timeZone: string,
  now: Date
): OpenWindow | null {
  const today = getLocalDateParts(now, timeZone);
  const yesterday = addDaysToLocalDate(today, -1);

  const candidateWindows = [
    getOpenWindowForLocalDate(hours, today, timeZone),
    getOpenWindowForLocalDate(hours, yesterday, timeZone),
  ].filter((value): value is OpenWindow => Boolean(value));

  for (const window of candidateWindows) {
    if (now >= window.openAt && now < window.closeAt) {
      return window;
    }
  }

  return null;
}

function findNextOpenWindow(
  hours: RestaurantHourRow[],
  timeZone: string,
  now: Date,
  maxDaysAhead: number
): OpenWindow | null {
  const today = getLocalDateParts(now, timeZone);
  let best: OpenWindow | null = null;

  for (let dayOffset = 0; dayOffset <= maxDaysAhead; dayOffset++) {
    const candidateDate = addDaysToLocalDate(today, dayOffset);
    const window = getOpenWindowForLocalDate(hours, candidateDate, timeZone);

    if (!window) {
      continue;
    }

    if (window.openAt <= now) {
      continue;
    }

    if (!best || window.openAt < best.openAt) {
      best = window;
    }
  }

  return best;
}

function formatAsapLabel(now: Date, readyAt: Date, timeZone: string): string {
  return `ASAP (ready around ${formatLocalTime(readyAt, timeZone)})`;
}

export function isRestaurantOpenAt(
  hours: RestaurantHourRow[],
  timeZone: string | null | undefined,
  target: Date
): boolean {
  const safeTimeZone = getSafeTimeZone(timeZone);
  return getCurrentOpenWindow(hours, safeTimeZone, target) !== null;
}

export function evaluateRestaurantHours(
  hours: RestaurantHourRow[],
  timeZone?: string | null,
  nowInput: Date = new Date(),
  options?: {
    asapPrepMinutes?: number;
    pickupSlotIntervalMinutes?: number;
    maxScheduleDaysAhead?: number;
    closingSoonThresholdMinutes?: number;
  }
): RestaurantHoursEvaluation {
  const safeTimeZone = getSafeTimeZone(timeZone);
  const now = new Date(nowInput);
  const asapPrepMinutes =
    options?.asapPrepMinutes ?? DEFAULT_ASAP_PREP_MINUTES;
  const pickupSlotIntervalMinutes =
    options?.pickupSlotIntervalMinutes ??
    DEFAULT_PICKUP_SLOT_INTERVAL_MINUTES;
  const maxScheduleDaysAhead =
    options?.maxScheduleDaysAhead ?? DEFAULT_MAX_SCHEDULE_DAYS_AHEAD;
  const closingSoonThresholdMinutes =
    options?.closingSoonThresholdMinutes ??
    DEFAULT_CLOSING_SOON_THRESHOLD_MINUTES;

  const nowParts = getTimeZoneParts(now, safeTimeZone);
  const currentWindow = getCurrentOpenWindow(hours, safeTimeZone, now);
  const nextOpenWindow = findNextOpenWindow(
    hours,
    safeTimeZone,
    now,
    maxScheduleDaysAhead
  );

  const readyAt = addMinutes(now, asapPrepMinutes);
  const allowsAsap = Boolean(
    currentWindow && readyAt >= currentWindow.openAt && readyAt < currentWindow.closeAt
  );

  const availableScheduledSlots: PickupOption[] = [];
  const today = getLocalDateParts(now, safeTimeZone);

  for (let dayOffset = 0; dayOffset < maxScheduleDaysAhead; dayOffset++) {
    const localDate = addDaysToLocalDate(today, dayOffset);
    const window = getOpenWindowForLocalDate(hours, localDate, safeTimeZone);

    if (!window) {
      continue;
    }

    let slot = roundUpToNextInterval(
      dayOffset === 0 ? readyAt : window.openAt,
      pickupSlotIntervalMinutes
    );

    if (slot < window.openAt) {
      slot = roundUpToNextInterval(window.openAt, pickupSlotIntervalMinutes);
    }

    while (slot < window.closeAt) {
      if (slot > now) {
        availableScheduledSlots.push({
          value: slot.toISOString(),
          label: formatScheduledSlotLabel(slot, now, safeTimeZone),
          pickupAt: slot.toISOString(),
        });
      }

      slot = addMinutes(slot, pickupSlotIntervalMinutes);
    }
  }

  const pickupOptions: PickupOption[] = [];

  if (allowsAsap) {
    pickupOptions.push({
      value: "ASAP",
      label: formatAsapLabel(now, readyAt, safeTimeZone),
      pickupAt: readyAt.toISOString(),
    });
  }

  pickupOptions.push(...availableScheduledSlots);

  const closesAtText = currentWindow
    ? formatLocalTime(currentWindow.closeAt, safeTimeZone)
    : null;
  const nextOpenTime = nextOpenWindow
    ? formatLocalTime(nextOpenWindow.openAt, safeTimeZone)
    : null;
  const nextOpenDay = nextOpenWindow
    ? WEEKDAY_LABELS[getTimeZoneParts(nextOpenWindow.openAt, safeTimeZone).weekday]
    : null;
  const openingToday = Boolean(
    nextOpenWindow &&
      areSameLocalDate(
        getLocalDateParts(nextOpenWindow.openAt, safeTimeZone),
        today
      )
  );
  const closingSoon = Boolean(
    currentWindow &&
      currentWindow.closeAt.getTime() - now.getTime() <=
        closingSoonThresholdMinutes * 60 * 1000
  );

  let statusText: string | null = null;
  let nextOpenText: string | null = null;

  if (currentWindow) {
    statusText = closesAtText ? `Open now • Closes at ${closesAtText}` : "Open now";
  } else if (nextOpenWindow) {
    const openText = formatOpenText(nextOpenWindow.openAt, now, safeTimeZone);
    statusText = `Closed now • ${openText}`;
    nextOpenText = `${openText}.`;
  } else {
    statusText = "Closed now";
    nextOpenText = "Closed now. No upcoming pickup hours are available.";
  }

  return {
    timeZone: safeTimeZone,
    currentDay: nowParts.weekday,
    restaurantLocalNow: formatRestaurantLocalTimestamp(now, safeTimeZone),
    isOpenNow: Boolean(currentWindow),
    allowsAsap,
    openingToday,
    closingSoon,
    opensAt: nextOpenTime,
    closesAt: closesAtText,
    closesAtText,
    nextOpenDay,
    nextOpenTime,
    nextOpenText,
    statusText,
    availableScheduledSlots,
    pickupOptions,
  };
}
