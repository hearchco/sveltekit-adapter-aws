// @ts-self-types="./index.d.ts"

/**
 * SvelteKit handler for AWS Lambda and Lambda@Edge.
 * @module sveltekit-adapter-aws
 */

import fs from "node:fs";
import path from "node:path";
import { installPolyfills } from "@sveltejs/kit/node/polyfills";
// @ts-ignore
import { Server } from "../index.js";
// @ts-ignore
import { manifest } from "../manifest.js";
import { isBinaryContentType } from "./binary.js";
import { convertFrom, convertTo } from "./event-mapper.js";
import { debug } from "./logger.js";
// @ts-ignore
import prerenderedFiles from "./prerendered-file-list.js";

installPolyfills();

/**
 * @typedef {import("./event-mapper.js").InternalEvent} InternalEvent
 * @typedef {import("@sveltejs/kit").Server} ServerType
 * @typedef {import("aws-lambda").APIGatewayProxyEventV2} APIGatewayProxyEventV2
 * @typedef {import("aws-lambda").APIGatewayProxyEvent} APIGatewayProxyEvent
 * @typedef {import("aws-lambda").CloudFrontRequestEvent} CloudFrontRequestEvent
 * @typedef {import("aws-lambda").CloudFrontRequest} CloudFrontRequest
 * @typedef {import("aws-lambda").CloudFrontRequestResult} CloudFrontRequestResult
 * @typedef {import("aws-lambda").APIGatewayProxyResultV2} APIGatewayProxyResultV2
 * @typedef {import("aws-lambda").APIGatewayProxyResult} APIGatewayProxyResult
 */

/** @type {ServerType} */
const app = new Server(manifest);
app.init({ env: /** @type {Record<string, string>} */ (process.env) });

/**
 * Handles incoming requests from AWS API Gateway or CloudFront and responds appropriately.
 * @param {APIGatewayProxyEvent | APIGatewayProxyEventV2 | CloudFrontRequestEvent} event - The incoming event from AWS Lambda.
 * @returns {Promise<CloudFrontRequest | CloudFrontRequestResult | APIGatewayProxyResult | APIGatewayProxyResultV2>} - The response to be returned to AWS Lambda.
 */
export async function handler(event) {
  debug("event", event);

  // Parse Lambda event
  const internalEvent = convertFrom(event);

  // Set correct host header
  if (internalEvent.headers["x-forwarded-host"]) {
    internalEvent.headers.host = internalEvent.headers["x-forwarded-host"];
  }

  // Check request is for prerendered file
  if (internalEvent.method === "GET") {
    const filePath = isPrerenderedFile(internalEvent.rawPath);
    if (filePath) {
      return internalEvent.type === "cf"
        ? formatCloudFrontPrerenderedResponse(
            /** @type {CloudFrontRequestEvent} */ (event),
            filePath
          )
        : formatAPIGatewayPrerenderedResponse(internalEvent, filePath);
    }
  }

  // Process request
  const requestUrl = `https://${internalEvent.headers.host}${internalEvent.url}`;
  const requestProps = {
    method: internalEvent.method,
    headers: internalEvent.headers,
    body: ["GET", "HEAD"].includes(internalEvent.method)
      ? undefined
      : internalEvent.body,
  };
  debug("request", requestUrl, requestProps);
  const request = new Request(requestUrl, requestProps);
  /** @type {Response} */
  const response = await app.respond(request, {
    getClientAddress: () => internalEvent.remoteAddress,
  });
  debug("response", response);

  //Parse the response into lambda proxy response
  if (response) {
    /** @type {Record<string, string[]>} */
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = headers[key] || [];
      headers[key].push(value);
    });
    const isBase64Encoded = isBinaryContentType(
      Array.isArray(headers["content-type"])
        ? headers["content-type"][0]
        : headers["content-type"]
    );
    const body = isBase64Encoded
      ? Buffer.from(await response.arrayBuffer()).toString("base64")
      : await response.text();
    return convertTo({
      type: internalEvent.type,
      statusCode: response.status,
      headers,
      isBase64Encoded,
      body,
    });
  }

  /** @type {CloudFrontRequestResult} */
  const notFoundResp = {
    statusCode: 404,
    body: "Not found.",
  };
  return notFoundResp;
}

/**
 * Checks if the URI corresponds to a prerendered file.
 * @param {string} uri - The URI to check.
 * @returns {string | undefined} The filepath if it is a prerendered file, otherwise undefined.
 */
function isPrerenderedFile(uri) {
  // Remove leading and trailing slashes
  const sanitizedUri = uri.replace(/^\/|\/$/g, "");

  if (sanitizedUri === "") {
    return prerenderedFiles.includes("index.html") ? "index.html" : undefined;
    // biome-ignore lint/style/noUselessElse: Expected
  } else if (prerenderedFiles.includes(sanitizedUri)) {
    return sanitizedUri;
    // biome-ignore lint/style/noUselessElse: Expected
  } else if (prerenderedFiles.includes(`${sanitizedUri}/index.html`)) {
    return `${sanitizedUri}/index.html`;
    // biome-ignore lint/style/noUselessElse: Expected
  } else if (prerenderedFiles.includes(`${sanitizedUri}.html`)) {
    return `${sanitizedUri}.html`;
  }

  return undefined;
}

/**
 * Formats a response for CloudFront when serving prerendered content.
 * @param {CloudFrontRequestEvent} event - The original CloudFront request event.
 * @param {string} filePath - The file path to the prerendered file.
 * @returns {CloudFrontRequest} The modified CloudFront request event.
 */
function formatCloudFrontPrerenderedResponse(event, filePath) {
  const request = event.Records[0].cf.request;
  request.uri = `/${filePath}`;
  return request;
}

/**
 * Formats a response for API Gateway when serving prerendered content.
 * @param {InternalEvent} internalEvent - The internal representation of the event.
 * @param {string} filePath - The file path to the prerendered file.
 * @returns {APIGatewayProxyResult | APIGatewayProxyResultV2 | CloudFrontRequestResult} The response object compatible with API Gateway.
 */
function formatAPIGatewayPrerenderedResponse(internalEvent, filePath) {
  return convertTo({
    type: internalEvent.type,
    statusCode: 200,
    headers: {
      "content-type": "text/html",
      "cache-control": "public, max-age=0, s-maxage=31536000, must-revalidate",
    },
    isBase64Encoded: false,
    body: fs.readFileSync(path.join("prerendered", filePath), "utf8"), // WARNING: Doesn't work on Lambda@Edge
  });
}
