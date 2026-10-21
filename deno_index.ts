// 涓?AstrBot 鎻愪緵 GitHub 鍔犻€熶唬鐞嗭紙閫傞厤 Deno Deploy / Deno 2 杩愯鏃讹級
// 鍘熺増浣跨敤 deno.land/std@0.155 鐨?serve()锛屽唴閮ㄤ緷璧栧凡鍦?Deno 2 绉婚櫎鐨?Deno.serveHttp锛?// 浼氬鑷?Deno Deploy 涓婂弽澶嶅穿婧冮噸鍚紙Warm up / Route 澶辫触锛夈€傝繖閲屾敼涓?Deno.serve銆?
async function handler(req: Request): Promise<Response> {
  const incomingUrl = new URL(req.url);

  if (incomingUrl.pathname === "/") {
    return new Response("姝ゅ湴鍧€鍙敤浜庝负astrbot鎻愪緵鏇村揩閫熺殑github璁块棶鏈嶅姟", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 浠庤姹傝矾寰勪腑鎻愬彇鐩爣 URL锛?https://github.com/...
  const targetUrlString = decodeURIComponent(incomingUrl.pathname.slice(1));

  if (!targetUrlString || (!targetUrlString.startsWith("http://") && !targetUrlString.startsWith("https://"))) {
    return new Response("Invalid or missing target URL in path. Usage: /<target_url>", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  console.log(`Proxying request to: ${targetUrlString}`);

  try {
    const fwdHeaders = new Headers(req.headers);
    fwdHeaders.delete("host");
    fwdHeaders.delete("connection");

    const response = await fetch(targetUrlString, {
      headers: fwdHeaders,
      method: req.method,
      body: req.body,
      redirect: "manual",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, *");

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching ${targetUrlString}:`, error);
    return new Response(`Failed to proxy request to ${targetUrlString}: ${msg}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

Deno.serve(handler);
