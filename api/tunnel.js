const TUNNEL_ORIGIN = "https://approx-marking-mpegs-stays.trycloudflare.com";

function normalizePath(value) {
  if (Array.isArray(value)) return value.join("/");
  return typeof value === "string" ? value : "";
}

function buildTargetUrl(req) {
  const forwardedPath = normalizePath(req.query?.path).replace(/^\/+/, "");
  const original = new URL(req.url || "/", "https://agentxplorer.com");
  original.searchParams.delete("path");
  const query = original.searchParams.toString();
  return `${TUNNEL_ORIGIN}/${forwardedPath}${query ? `?${query}` : ""}`;
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  const targetUrl = buildTargetUrl(req);
  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await getBody(req);
  const headers = { ...req.headers };
  delete headers.host;
  delete headers["x-forwarded-host"];
  delete headers["x-vercel-id"];
  delete headers.connection;
  delete headers["content-length"];

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
    redirect: "manual",
  });

  res.statusCode = upstream.status;
  upstream.headers.forEach((value, key) => {
    if (!["content-encoding", "transfer-encoding", "connection"].includes(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  });

  const buffer = Buffer.from(await upstream.arrayBuffer());
  res.end(buffer);
};
