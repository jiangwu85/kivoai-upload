export default {
  async fetch(request, env) {
      const authorization = request.headers.get("authorization");
      const access_token = authorization ? authorization.replace("Bearer ", "") : null;
      if (!access_token) {
          return new Response("Unauthorized", { status: 401 });
      }
      const user_data = await env.REDIS.get("auth_" + access_token);
       if (!user_data) {
           return new Response("Unauthorized", { status: 401 });
       }

    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/list") {
      const objects = await env.MY_BUCKET.list();
      return Response.json(
            {
              success: true,
              message: `success`,
              data: objects.objects.map(obj => ({
                key: obj.key,
                size: obj.size,
                uploaded: obj.uploaded
              }))
            });
    }
    if (path.startsWith("/upload/")) {
      const key = path.slice("/upload/".length);
      if (!key) {
        return new Response("Missing object key", { status: 400 });
      }
      await env.MY_BUCKET.put(key, request.body);
      return Response.json(
            {
              success: true,
              message: `success`,
              data: `${key}`
            });
    }
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
          "Content-Type": object.httpMetadata?.contentType || "application/octet-stream"
        }
      });
    }
    if (path.startsWith("/delete/")) {
      const key = path.slice("/delete/".length);
      if (!key) {
        return new Response("Missing object key", { status: 400 });
      }
      await env.MY_BUCKET.delete(key);
      return Response.json(
                  {
                    success: true,
                    message: `success`,
                    data: `${key}`
                  });
    }
    return new Response(`
Usage:
  GET  url                    → ${url}
  GET  path                    → ${path}
  GET  /list                    → List all objects
  PUT  /upload/<key>            → Upload object (send body)
  GET  /download/<key>          → Download object
  DELETE /delete/<key>          → Delete object
    `.trim(), { headers: { "Content-Type": "text/plain" } });
  }
};