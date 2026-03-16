export default {
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);

    const isLocal =
      url.hostname === "127.0.0.1" || url.hostname === "localhost";
    const isMcaab = url.hostname === "mcaab.authtoolkit.com";

    if (isLocal || isMcaab) {
      if (url.pathname === "/privacy") {
        return Response.redirect(`${url.origin}/privacy.html`, 302);
      }

      if (url.pathname === "/terms") {
        return Response.redirect(`${url.origin}/terms.html`, 302);
      }

      if (url.pathname === "/" || url.pathname === "") {
        return new Response("MCAAB service running", {
          headers: { "content-type": "text/plain; charset=UTF-8" },
        });
      }
    }

    return new Response("AuthToolkit worker running", {
      headers: { "content-type": "text/plain; charset=UTF-8" },
    });
  },
};