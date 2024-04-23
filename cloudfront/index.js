/**
 * @typedef {import("aws-lambda").CloudFrontFunctionsEvent} CloudFrontFunctionsEvent
 */

/**
 * Note: form action requests contain "/" in request query string
 * ie. POST request with query string "?/action"
 * CloudFront does not allow query string with "/". It needs to be encoded.
 * @param {CloudFrontFunctionsEvent} event
 * @returns {any}
 */
export function handler(event) {
  var request = event.request;
  request.headers['x-forwarded-host'] = request.headers.host;
  for (var key in request.querystring) {
    if (key.includes('/')) {
      request.querystring[encodeURIComponent(key)] = request.querystring[key];
      delete request.querystring[key];
    }
  }
  return request;
}
