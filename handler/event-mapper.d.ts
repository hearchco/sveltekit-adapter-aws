/**
 * Represents an internal event type.
 * @typedef {Object} InternalEvent
 * @property {"v1"|"v2"|"cf"} type The type of the event.
 * @property {string} method HTTP method used in the event.
 * @property {string} rawPath The raw path accessed in the event.
 * @property {string} url The full URL accessed in the event.
 * @property {Buffer} body The request body as a Buffer.
 * @property {Record<string, string>} headers Headers associated with the event.
 * @property {string} remoteAddress The IP address of the requester.
 */
/**
 * Represents an internal result format.
 * @typedef {Object} InternalResult
 * @property {"v1"|"v2"|"cf"} type The type of the result.
 * @property {number} statusCode HTTP status code.
 * @property {Record<string, string|string[]>} headers Headers to send in the response.
 * @property {string} body The response body as a string.
 * @property {boolean} isBase64Encoded Whether the body is base64 encoded.
 */
/**
 * Checks if the event is an API Gateway V2 event.
 * @param {any} event The event to check.
 * @returns {event is APIGatewayProxyEventV2} True if it's an API Gateway V2 event.
 */
export function isAPIGatewayProxyEventV2(event: any): event is import("aws-lambda").APIGatewayProxyEventV2;
/**
 * Checks if the event is an API Gateway V1 event.
 * @param {any} event The event to check.
 * @returns {event is APIGatewayProxyEvent} True if it's an API Gateway V1 event.
 */
export function isAPIGatewayProxyEvent(event: any): event is import("aws-lambda").APIGatewayProxyEvent;
/**
 * Checks if the event is a CloudFront request event.
 * @param {any} event The event to check.
 * @returns {event is CloudFrontRequestEvent} True if it's a CloudFront request event.
 */
export function isCloudFrontRequestEvent(event: any): event is import("aws-lambda").CloudFrontRequestEvent;
/**
 * Converts an API Gateway or CloudFront event to an internal event format.
 * @param {APIGatewayProxyEventV2|APIGatewayProxyEvent|CloudFrontRequestEvent} event The event to convert.
 * @returns {InternalEvent} The internal event.
 */
export function convertFrom(event: import("aws-lambda").APIGatewayProxyEventV2 | import("aws-lambda").APIGatewayProxyEvent | CloudFrontRequestEvent): InternalEvent;
/**
 * Converts an internal result to a corresponding AWS API Gateway or CloudFront result.
 * @param {InternalResult} result The internal result to convert.
 * @returns {APIGatewayProxyResultV2|APIGatewayProxyResult|CloudFrontRequestResult} The API Gateway or CloudFront result.
 */
export function convertTo(result: InternalResult): APIGatewayProxyResultV2 | APIGatewayProxyResult | CloudFrontRequestResult;
/**
 * Represents an internal event type.
 */
export type InternalEvent = {
    /**
     * The type of the event.
     */
    type: "v1" | "v2" | "cf";
    /**
     * HTTP method used in the event.
     */
    method: string;
    /**
     * The raw path accessed in the event.
     */
    rawPath: string;
    /**
     * The full URL accessed in the event.
     */
    url: string;
    /**
     * The request body as a Buffer.
     */
    body: Buffer;
    /**
     * Headers associated with the event.
     */
    headers: Record<string, string>;
    /**
     * The IP address of the requester.
     */
    remoteAddress: string;
};
/**
 * Represents an internal result format.
 */
export type InternalResult = {
    /**
     * The type of the result.
     */
    type: "v1" | "v2" | "cf";
    /**
     * HTTP status code.
     */
    statusCode: number;
    /**
     * Headers to send in the response.
     */
    headers: Record<string, string | string[]>;
    /**
     * The response body as a string.
     */
    body: string;
    /**
     * Whether the body is base64 encoded.
     */
    isBase64Encoded: boolean;
};
export type APIGatewayProxyEventV2 = import("aws-lambda").APIGatewayProxyEventV2;
export type APIGatewayProxyResultV2 = import("aws-lambda").APIGatewayProxyResultV2;
export type APIGatewayProxyEvent = import("aws-lambda").APIGatewayProxyEvent;
export type APIGatewayProxyResult = import("aws-lambda").APIGatewayProxyResult;
export type CloudFrontRequestEvent = import("aws-lambda").CloudFrontRequestEvent;
export type CloudFrontRequestResult = import("aws-lambda").CloudFrontRequestResult;
export type CloudFrontHeaders = import("aws-lambda").CloudFrontHeaders;
