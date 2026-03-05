const TERMINAL_TEXT = `
██████╗ ██╗     ███████╗██╗   ██╗
██╔══██╗██║     ██╔════╝██║   ██║
██████╔╝██║     █████╗  ██║   ██║
██╔══██╗██║     ██╔══╝  ██║   ██║
██████╔╝███████╗███████╗╚██████╔╝
╚═════╝ ╚══════╝╚══════╝ ╚═════╝

Build • Learn • Explore • Unite

join us. grow. help others grow.

Website: https://bleu-community.tech
Community Blogs: https://bleu-community.tech/blogs/
GitHub: https://github.com/BLEU-IO
Discord: https://discord.gg/sjU9VCT3h4

Try these endpoints:
$ curl https://bleu-community.tech
$ curl https://bleu-community.tech/terminal-help.txt
$ curl https://bleu-community.tech/terminal.json
`;

const CLI_UA_RE = /(curl|wget|httpie|powershell|python-requests|go-http-client|libwww-perl|axios|node-fetch|okhttp|java)/i;

function isBrowserRequest(request) {
  const ua = request.headers.get("user-agent") || "";
  const accept = (request.headers.get("accept") || "").toLowerCase();
  const secFetchMode = request.headers.get("sec-fetch-mode");
  const secFetchDest = request.headers.get("sec-fetch-dest");

  if (CLI_UA_RE.test(ua)) return false;
  if (secFetchMode || secFetchDest) return true;

  return accept.includes("text/html");
}

function terminalResponse(method) {
  const headers = {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "public, max-age=300",
    "x-bleu-terminal": "1"
  };

  if (method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(TERMINAL_TEXT, { status: 200, headers });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      if (isBrowserRequest(request)) {
        // Serve the normal homepage while keeping browser URL at "/".
        const originIndex = new URL("/index.html", url);
        const browserReq = new Request(originIndex.toString(), request);
        return fetch(browserReq);
      }
      return terminalResponse(request.method);
    }

    return fetch(request);
  }
};
