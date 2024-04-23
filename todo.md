- npm run build
- placeholder env?
- server, client, prerendered dirs
- handler: server/lambda-handler/index.handler (file.func)
- cloudfront function minified and inlined
  this.useCloudFrontFunctionHostHeaderInjection(),
  // Note: form action requests contain "/" in request query string
  // ie. POST request with query string "?/action"
  // CloudFront does not allow query string with "/". It needs to be encoded.

  ```
    function handler(event) {
    var request = event.request;
    request.headers["x-forwarded-host"] = request.headers.host;
    for (var key in request.querystring) {,
      if (key.includes("/")) {,
        request.querystring[encodeURIComponent(key)] = request.querystring[key];,
        delete request.querystring[key];,
      },
    },
    return request;
    }`;
  ```

- esbuild server handler (minify, sourcemap inline)
- create lambda or edge function, grant readwrite perm to S3 bucket # why write?
- s3: copy client dir with cache, \_app is versioned
- s3: copy prerendered w/o cache
- behaviors: if edge: attach to cloudfront and use S3 as origin -> else: use lambda as origin
- create 1 behavior for each top level asset file (name) or folder (name/\*) with origin s3
