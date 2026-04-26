function normalizeBaseUrl(value: string | null | undefined) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function isWorkersDevHost(host: string) {
  return /\.workers\.dev$/i.test(host);
}

export function getAppBaseUrl(req?: Request) {
  const envUrl =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeBaseUrl(process.env.SITE_URL);

  const forwardedHost = normalizeBaseUrl(
    req?.headers.get("x-forwarded-host") || req?.headers.get("host")
  );
  const forwardedProto = normalizeBaseUrl(req?.headers.get("x-forwarded-proto"));

  if (forwardedHost && !isWorkersDevHost(forwardedHost)) {
    const protocol =
      forwardedProto || (envUrl.startsWith("https://") ? "https" : "http");
    return `${protocol}://${forwardedHost}`;
  }

  if (envUrl) {
    const envHost = new URL(envUrl).host;

    if (!isWorkersDevHost(envHost)) {
      return envUrl;
    }
  }

  if (req?.url) {
    const requestOrigin = normalizeBaseUrl(new URL(req.url).origin);
    const requestHost = new URL(req.url).host;

    if (!isWorkersDevHost(requestHost)) {
      return requestOrigin;
    }

    if (envUrl) {
      return envUrl;
    }

    return requestOrigin;
  }

  return envUrl || "http://localhost:3000";
}
