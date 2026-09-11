// Password-gate the whole site via HTTP Basic auth. The password is read from
// the SITE_PASSWORD environment variable (set in the Netlify UI) and is never
// stored in this repo. Wrapped so it can never crash open — any unexpected
// error challenges for credentials instead of exposing the site.
function getEnv(key) {
  try { if (typeof Netlify !== "undefined" && Netlify.env) return Netlify.env.get(key); } catch (_) {}
  try { if (typeof Deno !== "undefined" && Deno.env) return Deno.env.get(key); } catch (_) {}
  return undefined;
}

function challenge() {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "www-authenticate": 'Basic realm="Tidebreak Capital — Private", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

export default async (request, context) => {
  try {
    const PASSWORD = getEnv("SITE_PASSWORD");
    if (!PASSWORD) {
      return new Response(
        "Site password not configured. In Netlify → Site configuration → " +
          "Environment variables, add SITE_PASSWORD, then redeploy.",
        { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }

    const header = request.headers.get("authorization") || "";
    const sp = header.indexOf(" ");
    const scheme = sp === -1 ? header : header.slice(0, sp);
    const encoded = sp === -1 ? "" : header.slice(sp + 1);

    if (scheme === "Basic" && encoded) {
      let decoded = "";
      try { decoded = atob(encoded); } catch (_) { decoded = ""; }
      const idx = decoded.indexOf(":");
      const supplied = idx === -1 ? decoded : decoded.slice(idx + 1); // any username
      if (supplied === PASSWORD) {
        return context.next(); // authorized -> serve the static site
      }
    }
    return challenge();
  } catch (_) {
    return challenge(); // never expose the site on an unexpected error
  }
};

export const config = { path: "/*" };

// redeploy marker: 20260911T233429Z

// redeploy (repo public again): 20260911T234651Z
