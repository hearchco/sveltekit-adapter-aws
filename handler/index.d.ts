/**
 * Handles incoming requests from AWS API Gateway or CloudFront and responds appropriately.
 * @param {APIGatewayProxyEventV2 | CloudFrontRequestEvent | APIGatewayProxyEvent} event - The incoming event from AWS Lambda.
 * @returns {Promise<any>} The response to be returned to AWS Lambda.
 */
export function handler(
  event:
    | import('aws-lambda').APIGatewayProxyEventV2
    | CloudFrontRequestEvent
    | import('aws-lambda').APIGatewayProxyEvent
): Promise<any>;
export type InternalEvent = import('./event-mapper.js').InternalEvent;
export type ServerType = import('@sveltejs/kit').Server;
export type APIGatewayProxyEventV2 = import(
  'aws-lambda'
).APIGatewayProxyEventV2;
export type APIGatewayProxyEvent = import('aws-lambda').APIGatewayProxyEvent;
export type CloudFrontRequestEvent = import(
  'aws-lambda'
).CloudFrontRequestEvent;
export type CloudFrontRequest = import('aws-lambda').CloudFrontRequest;
export type CloudFrontRequestResult = import(
  'aws-lambda'
).CloudFrontRequestResult;
export type APIGatewayProxyResultV2 = import(
  'aws-lambda'
).APIGatewayProxyResultV2;
export type APIGatewayProxyResult = import('aws-lambda').APIGatewayProxyResult;
