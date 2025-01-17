// @ts-self-types="./index.d.ts"

/**
 * SvelteKit handler for AWS Cloudfront function v2.
 * @module sveltekit-adapter-aws
 */

/**
 * @typedef {import("aws-lambda").CloudFrontFunctionsEvent} CloudFrontFunctionsEvent
 * @typedef {import("aws-lambda").CloudFrontFunctionsQuerystring} CloudFrontFunctionsQuerystring
 * @typedef {import("aws-lambda").CloudFrontFunctionsEvent.request} CloudFrontFunctionsRequest
 */

/**
 * Note: form action requests contain "/" in request query string
 * ie. POST request with query string "?/action"
 * CloudFront does not allow query string with "/". It needs to be encoded.
 * @param {CloudFrontFunctionsEvent} event - Cloudfront functions event
 * @returns {CloudFrontFunctionsRequest} - Cloudfront function event request
 */
// biome-ignore lint/correctness/noUnusedVariables: This is expected and must be in this format for Cloudfront
function handler(event) {
  const request = event.request;

  if (request.headers.host) {
    request.headers["x-forwarded-host"] = request.headers.host;
  }

  /** @type {CloudFrontFunctionsQuerystring} */
  const newQuerystring = {};
  for (const key in request.querystring) {
    if (key.includes("/")) {
      newQuerystring[encodeURIComponent(key)] = request.querystring[key];
    } else {
      newQuerystring[key] = request.querystring[key];
    }
  }
  request.querystring = newQuerystring;

  return request;
}
