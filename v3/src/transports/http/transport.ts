import { GraphQLRequest, GraphQLResponse, processGraphqlRequest } from '../../execution';
import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';
import { GraphQLSchema } from "graphql";

export interface HttpRequest {
  method: string;
  headers: IncomingHttpHeaders;
  url?: string;
  // TODO body!
  parsedRequest: GraphQLRequest,
}

export interface HttpResponse {
  statusCode: number;
  statusMessage?: string;
  body: AsyncIterable<GraphQLResponse>;
  headers: OutgoingHttpHeaders;
}

export async function processHttpRequest(
  /**
   * This should be shaped by the HTTP framework adapter, into the expected
   * interface for this transport.
   */
  { schema,
    request,
  }:
  {
    schema: GraphQLSchema,
    request: HttpRequest,
  }
): Promise<HttpResponse> {

  // // Create the shape of the response object. This should populate the response
  // // context.
  // const responseInit: GraphQLResponse = {
  //   http: {
  //     headers: new Headers({
  //       'content-Type': 'application/json',
  //     }),
  //   }
  // };

  // Keep the transport-specific context, which we created above, separate.
  const response = await processGraphqlRequest({
    schema,
    request: request.parsedRequest
  });

  /**
   * In the future, GraphQL execution should return an `AsyncIterable`. However,
   * today it returns a `Promise`, so we'll therefore coerce it into an
   * `AsyncIterable` through the use of a generator function which is
   * implemented on the `Symbol.asyncIterator` property.
   */
  const body = {
    [Symbol.asyncIterator]: async function*() {
      yield response;
    },
  };

  return {
    body,
    statusCode: 200,
    headers: {},
  };
}
