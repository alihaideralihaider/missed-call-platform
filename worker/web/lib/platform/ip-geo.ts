export type IpGeoLookupResult = {
  city: string | null;
  region: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
};

function normalizeText(value: unknown) {
  const text = String(value || "").trim();
  return text || null;
}

function parseCoordinate(value: string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPrivateIpv4(ip: string) {
  return (
    ip.startsWith("10.") ||
    ip.startsWith("127.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

function isPrivateIp(ip: string) {
  const normalized = String(ip || "").trim().toLowerCase();

  if (!normalized) return true;
  if (normalized === "localhost" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80:")) return true;
  if (normalized.includes(":")) return false;

  return isPrivateIpv4(normalized);
}

function getIpinfoUrl(ip: string) {
  const token = String(process.env.IPINFO_TOKEN || "").trim();

  if (!token) {
    return "";
  }

  const baseUrl =
    String(process.env.IPINFO_BASE_URL || "").trim() || "https://ipinfo.io";

  return `${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(ip)}/json?token=${encodeURIComponent(
    token
  )}`;
}

export async function lookupIpLocation(ip: string): Promise<IpGeoLookupResult | null> {
  const normalizedIp = String(ip || "").trim();

  if (!normalizedIp || isPrivateIp(normalizedIp)) {
    return null;
  }

  const url = getIpinfoUrl(normalizedIp);

  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn("IP geolocation lookup failed:", {
        ip: normalizedIp,
        status: response.status,
      });
      return null;
    }

    const data = (await response.json()) as {
      city?: string;
      region?: string;
      country?: string;
      loc?: string;
    };

    const loc = String(data.loc || "").trim();
    const [latRaw, lonRaw] = loc ? loc.split(",") : [null, null];

    return {
      city: normalizeText(data.city),
      region: normalizeText(data.region),
      country: normalizeText(data.country),
      lat: parseCoordinate(latRaw),
      lon: parseCoordinate(lonRaw),
    };
  } catch (error) {
    console.warn("IP geolocation lookup threw unexpectedly:", {
      ip: normalizedIp,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return null;
  }
}
