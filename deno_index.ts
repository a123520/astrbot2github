// 为 AstrBot 提供 GitHub 加速代理（适配 Deno Deploy / Deno 2 运行时）
// 原版使用 deno.land/std@0.155 的 serve()，内部依赖已在 Deno 2 移除的 Deno.serveHttp，
// 会导致 Deno Deploy 上反复崩溃重启（Warm up / Route 失败）。这里改为 Deno.serve。

async function handler(req: Request): Promise<Response> {
  const incomingUrl = new URL(req.url);

  if (incomingUrl.pathname === "/") {
    return new Response("此地址只用于为astrbot提供更快速的github访问服务", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 从请求路径中提取目标 URL：/https://github.com/...
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
    // Deno 的 fetch 已自动解压 body，但会保留上游的 content-encoding / content-length，
    // 原样转发会导致下游拿到空响应（gzip 内容与长度对不上），必须删掉让 Deno 重新分帧。
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
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
