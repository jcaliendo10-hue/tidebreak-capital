// Password-gate the entire site. The password is read from the Netlify
// environment variable SITE_PASSWORD — it is never stored in this repo.
export default async (request) => {
  const PASSWORD = Netlify.env.get("SITE_PASSWORD");

  // Fail safe: if no password is configured, block rather than expose the site.
  if (!PASSWORD) {
    return new Response(
      "Site password not configured. Set SITE_PASSWORD in Netlify → " +
        "Site configuration → Environment variables, then redeploy.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  const header = request.headers.get("authorization") || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    let decoded = "";
    try { decoded = atob(encoded); } catch (_) { decoded = ""; }
    const supplied = decoded.slice(decoded.indexOf(":") + 1); // any username, check password
    if (supplied === PASSWORD) {
      return; // authorized -> let the request through to the static site
    }
  }

  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "www-authenticate": 'Basic realm="Tidebreak Capital — Private", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8",
    },
  });
};

export const config = { path: "/*" };
