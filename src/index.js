
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type"
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const authorization = request.headers.get("authorization");
    const access_token = authorization ? authorization.replace("Bearer ", "") : null;
    if (!access_token) {
      return new Response("Unauthorized", { status: 401 });
    }
    const user_data = await env.MY_KV.get("auth_" + access_token);
    if (!user_data) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // 路由：/list → 列出对象
    if (path === "/list") {
      const objects = await env.MY_BUCKET.list();
      const data = {
        "code": 200,
        "message": "success",
        "data": {
            "keys": objects.objects.map(obj => ({
                        "key": obj.key,
                        "size": obj.size,
                        "uploaded": obj.uploaded
                  }))
        }
      }
      return Response.json(data, { headers: corsHeaders });
    }

    // 路由：/upload/<key> + PUT → 上传
    if (path.startsWith("/upload/")) {
      const key = path.slice("/upload/".length);
      if (!key) {
        return new Response("Missing object key", { status: 400 });
      }
      await env.MY_BUCKET.put(key, request.body);
      const data = {
        "code": 200,
        "message": "success",
        "data": { "key": key }
      }
      return Response.json(data, { headers: corsHeaders });
    }

    // 路由：/download/<key> + GET → 下载
    if (path.startsWith("/download/")) {
      const key = path.slice("/download/".length);
      if (!key) {
        return new Response("Missing object key", { status: 400 });
      }
      const object = await env.MY_BUCKET.get(key);
      if (!object) {
        return new Response("Object not found", { status: 404 });
      }
      return new Response(object.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": object.httpMetadata?.contentType || "application/octet-stream"
        }
      });
    }

    // 路由：/delete/<key> + DELETE → 删除
    if (path.startsWith("/delete/")) {
      const key = path.slice("/delete/".length);
      if (!key) {
        return new Response("Missing object key", { status: 400 });
      }
      await env.MY_BUCKET.delete(key);
      const data = {
              "code": 200,
              "message": "success",
              "data": { "key": key }
      }
      return Response.json(data, { headers: corsHeaders });
    }

    // 根路径：返回使用说明
    return new Response(`
Usage:
  GET  /list                    → List all objects
  PUT  /upload/<key>            → Upload object (send body)
  GET  /download/<key>          → Download object
  DELETE /delete/<key>          → Delete object
    `.trim(), { headers: { "Content-Type": "text/plain" } });
  }
};