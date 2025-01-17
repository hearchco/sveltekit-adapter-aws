// @ts-self-types="./event-mapper.d.ts"

/**
 * @typedef {import("aws-lambda").APIGatewayProxyEventV2} APIGatewayProxyEventV2
 * @typedef {import("aws-lambda").APIGatewayProxyResultV2} APIGatewayProxyResultV2
 * @typedef {import("aws-lambda").APIGatewayProxyEvent} APIGatewayProxyEvent
 * @typedef {import("aws-lambda").APIGatewayProxyResult} APIGatewayProxyResult
 * @typedef {import("aws-lambda").CloudFrontRequestEvent} CloudFrontRequestEvent
 * @typedef {import("aws-lambda").CloudFrontRequestResult} CloudFrontRequestResult
 * @typedef {import("aws-lambda").CloudFrontHeaders} CloudFrontHeaders
 */

import { debug } from './logger.js';

/**
 * Represents an internal event type.
 * @typedef {object} InternalEvent
 * @property {"v1" | "v2" | "cf"} type The type of the event.
 * @property {string} method HTTP method used in the event.
 * @property {string} rawPath The raw path accessed in the event.
 * @property {string} url The full URL accessed in the event.
 * @property {Buffer} body The request body as a Buffer.
 * @property {Record<string, string>} headers Headers associated with the event.
 * @property {string} remoteAddress The IP address of the requester.
 */

/**
 * Represents an internal result format.
 * @typedef {object} InternalResult
 * @property {"v1" | "v2" | "cf"} type The type of the result.
 * @property {number} statusCode HTTP status code.
 * @property {Record<string, string|string[]>} headers Headers to send in the response.
 * @property {string} body The response body as a string.
 * @property {boolean} isBase64Encoded Whether the body is base64 encoded.
 */

/**
 * Checks if the event is an API Gateway V2 event.
 * @param {APIGatewayProxyEventV2 | APIGatewayProxyEvent | CloudFrontRequestEvent} event The event to check.
 * @returns {event is APIGatewayProxyEventV2} True if it's an API Gateway V2 event.
 */
export function isAPIGatewayProxyEventV2(event) {
  return event.version === '2.0';
}

/**
 * Checks if the event is an API Gateway V1 event.
 * @param {APIGatewayProxyEventV2 | APIGatewayProxyEvent | CloudFrontRequestEvent} event The event to check.
 * @returns {event is APIGatewayProxyEvent} True if it's an API Gateway V1 event.
 */
export function isAPIGatewayProxyEvent(event) {
  return event.version === undefined && !isCloudFrontRequestEvent(event);
}

/**
 * Checks if the event is a CloudFront request event.
 * @param {APIGatewayProxyEventV2 | APIGatewayProxyEvent | CloudFrontRequestEvent} event The event to check.
 * @returns {event is CloudFrontRequestEvent} True if it's a CloudFront request event.
 */
export function isCloudFrontRequestEvent(event) {
  return event.Records !== undefined;
}

/**
 * Converts an API Gateway or CloudFront event to an internal event format.
 * @param {APIGatewayProxyEventV2 | APIGatewayProxyEvent | CloudFrontRequestEvent} event The event to convert.
 * @returns {InternalEvent} The internal event.
 */
export function convertFrom(event) {
  if (isCloudFrontRequestEvent(event)) {
    return convertFromCloudFrontRequestEvent(event);
    // biome-ignore lint/style/noUselessElse: Expected
  } else if (isAPIGatewayProxyEventV2(event)) {
    return convertFromAPIGatewayProxyEventV2(event);
    // biome-ignore lint/style/noUselessElse: Expected
  } else if (isAPIGatewayProxyEvent(event)) {
    return convertFromAPIGatewayProxyEvent(event);
  }

  throw new Error('Unsupported event type');
}

/**
 * Converts an internal result to a corresponding AWS API Gateway or CloudFront result.
 * @param {InternalResult} result The internal result to convert.
 * @returns {APIGatewayProxyResultV2 | APIGatewayProxyResult | CloudFrontRequestResult} The API Gateway or CloudFront result.
 */
export function convertTo(result) {
  switch (result.type) {
    case 'v2':
      return convertToApiGatewayProxyResultV2(result);
    case 'v1':
      return convertToApiGatewayProxyResult(result);
    case 'cf':
      return convertToCloudFrontRequestResult(result);
    default:
      throw new Error('Unsupported event type');
  }
}

/**
 * Converts an API Gateway V1 event to an internal event format.
 * @param {APIGatewayProxyEvent} event The event to convert.
 * @returns {InternalEvent} The internal event.
 */
function convertFromAPIGatewayProxyEvent(event) {
  const { path, body, httpMethod, requestContext, isBase64Encoded } = event;
  return {
    type: 'v1',
    method: httpMethod,
    rawPath: path,
    url: path + normalizeAPIGatewayProxyEventQueryParams(event),
    body: Buffer.from(body ?? '', isBase64Encoded ? 'base64' : 'utf8'),
    headers: normalizeAPIGatewayProxyEventHeaders(event),
    remoteAddress: requestContext.identity.sourceIp
  };
}

/**
 * Converts an API Gateway V2 event to an internal event format.
 * @param {APIGatewayProxyEventV2} event The event to convert.
 * @returns {InternalEvent} The internal event.
 */
function convertFromAPIGatewayProxyEventV2(event) {
  const { rawPath, rawQueryString, requestContext } = event;
  return {
    type: 'v2',
    method: requestContext.http.method,
    rawPath,
    url: rawPath + (rawQueryString ? `?${rawQueryString}` : ''),
    body: normalizeAPIGatewayProxyEventV2Body(event),
    headers: normalizeAPIGatewayProxyEventV2Headers(event),
    remoteAddress: requestContext.http.sourceIp
  };
}

/**
 * Converts a CloudFront request event to an internal event format.
 * @param {CloudFrontRequestEvent} event The event to convert.
 * @returns {InternalEvent} The internal event.
 */
function convertFromCloudFrontRequestEvent(event) {
  const { method, uri, querystring, body, headers, clientIp } =
    event.Records[0].cf.request;
  return {
    type: 'cf',
    method,
    rawPath: uri,
    url: uri + (querystring ? `?${querystring}` : ''),
    body: Buffer.from(
      body?.data ?? '',
      body?.encoding === 'base64' ? 'base64' : 'utf8'
    ),
    headers: normalizeCloudFrontRequestEventHeaders(headers),
    remoteAddress: clientIp
  };
}

/**
 * Converts an internal result to an API Gateway V1 response format.
 * @param {InternalResult} result The result to convert.
 * @returns {APIGatewayProxyResult} The API Gateway V1 result.
 */
function convertToApiGatewayProxyResult(result) {
  /** @type {Record<string, string>} */
  const headers = {};
  /** @type {Record<string, string[]>} */
  const multiValueHeaders = {};

  const resultHeaders = Object.entries(result.headers);
  for (const [key, value] of resultHeaders) {
    if (Array.isArray(value)) {
      multiValueHeaders[key] = value;
    } else {
      if (value === null) {
        headers[key] = '';
        return;
      }
      headers[key] = value;
    }
  }

  /** @type {APIGatewayProxyResult} */
  const response = {
    statusCode: result.statusCode,
    headers,
    body: result.body,
    isBase64Encoded: result.isBase64Encoded,
    multiValueHeaders
  };
  debug(response);
  return response;
}

/**
 * Converts an internal result to an API Gateway V2 response format.
 * @param {InternalResult} result The result to convert.
 * @returns {APIGatewayProxyResultV2} The API Gateway V2 result.
 */
function convertToApiGatewayProxyResultV2(result) {
  /** @type {Record<string, string>} */
  const headers = {};

  const resultHeaders = Object.entries(result.headers).filter(
    ([key]) => key.toLowerCase() !== 'set-cookie'
  );
  for (const [key, value] of resultHeaders) {
    if (value === null) {
      headers[key] = '';
      return;
    }
    headers[key] = Array.isArray(value) ? value.join(', ') : value.toString();
  }

  /** @type {APIGatewayProxyResultV2} */
  const response = {
    statusCode: result.statusCode,
    headers,
    cookies: /** @type {string[]|undefined} */ (result.headers['set-cookie']),
    body: result.body,
    isBase64Encoded: result.isBase64Encoded
  };
  debug(response);
  return response;
}

/**
 * Converts an internal result to a CloudFront request result.
 * @param {InternalResult} result The result to convert.
 * @returns {CloudFrontRequestResult} The CloudFront result.
 */
function convertToCloudFrontRequestResult(result) {
  /** @type {CloudFrontHeaders} */
  const headers = {};

  const resultHeaders = Object.entries(result.headers).filter(
    ([key]) => key.toLowerCase() !== 'content-length'
  );

  for (const [key, value] of resultHeaders) {
    headers[key] = [
      ...(headers[key] || []),
      ...(Array.isArray(value)
        ? value.map(v => ({ key, value: v }))
        : [{ key, value: value.toString() }])
    ];
  }

  /** @type {CloudFrontRequestResult} */
  const response = {
    status: result.statusCode.toString(),
    statusDescription: 'OK',
    headers,
    bodyEncoding: result.isBase64Encoded ? 'base64' : 'text',
    body: result.body
  };
  debug(response);
  return response;
}

/**
 * Normalizes the headers for API Gateway V2 events.
 * @param {APIGatewayProxyEventV2} event The API Gateway V2 event.
 * @returns {Record<string, string>} Normalized headers.
 */
function normalizeAPIGatewayProxyEventV2Headers(event) {
  const { headers: rawHeaders, cookies } = event;

  /** @type {Record<string, string>} */
  const headers = {};

  if (Array.isArray(cookies)) {
    headers.cookie = cookies.join('; ');
  }

  for (const [key, value] of Object.entries(rawHeaders || {})) {
    headers[key.toLowerCase()] = /** @type {string} */ (value);
  }

  return headers;
}

/**
 * Normalizes the body for API Gateway V2 events.
 * @param {APIGatewayProxyEventV2} event The API Gateway V2 event.
 * @returns {Buffer} The normalized body.
 */
function normalizeAPIGatewayProxyEventV2Body(event) {
  const { body, isBase64Encoded } = event;

  if (Buffer.isBuffer(body)) {
    return body;
    // biome-ignore lint/style/noUselessElse: Expected
  } else if (typeof body === 'string') {
    return Buffer.from(body, isBase64Encoded ? 'base64' : 'utf8');
    // biome-ignore lint/style/noUselessElse: Expected
  } else if (typeof body === 'object') {
    return Buffer.from(JSON.stringify(body));
  }

  return Buffer.from('', 'utf8');
}

/**
 * Normalizes query parameters for API Gateway V1 events.
 * @param {APIGatewayProxyEvent} event The API Gateway V1 event.
 * @returns {string} A string of normalized query parameters.
 */
function normalizeAPIGatewayProxyEventQueryParams(event) {
  const params = new URLSearchParams();
  if (event.multiValueQueryStringParameters) {
    for (const [key, value] of Object.entries(
      event.multiValueQueryStringParameters
    )) {
      if (value !== undefined) {
        for (const v of value) {
          params.append(key, v);
        }
      }
    }
  }
  if (event.queryStringParameters) {
    for (const [key, value] of Object.entries(event.queryStringParameters)) {
      if (value !== undefined) {
        params.append(key, value);
      }
    }
  }
  const value = params.toString();
  return value ? `?${value}` : '';
}

/**
 * Normalizes headers for API Gateway V1 events.
 * @param {APIGatewayProxyEvent} event The API Gateway V1 event.
 * @returns {Record<string, string>} Normalized headers.
 */
function normalizeAPIGatewayProxyEventHeaders(event) {
  event.multiValueHeaders;
  /** @type {Record<string, string>} */
  const headers = {};

  for (const [key, values] of Object.entries(event.multiValueHeaders)) {
    if (values) {
      headers[key.toLowerCase()] = values.join(',');
    }
  }
  for (const [key, value] of Object.entries(event.headers)) {
    if (value) {
      headers[key.toLowerCase()] = value;
    }
  }
  return headers;
}

/**
 * Normalizes headers for CloudFront request events.
 * @param {CloudFrontHeaders} rawHeaders The CloudFront headers to normalize.
 * @returns {Record<string, string>} Normalized headers.
 */
function normalizeCloudFrontRequestEventHeaders(rawHeaders) {
  /** @type {Record<string, string>} */
  const headers = {};

  for (const [key, values] of Object.entries(rawHeaders)) {
    for (const { value } of values) {
      if (value) {
        headers[key.toLowerCase()] = value;
      }
    }
  }

  return headers;
}
