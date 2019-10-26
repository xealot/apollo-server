import { ApolloServer } from "../../index";
import { GraphQLRequest, GraphQLResponse } from '../../execution';
import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';
import { Headers } from "apollo-server-env";

// interface GraphQLRequestWithHttp extends GraphQLRequestWithoutHttp {
//   http: HttpRequest;
// }

// interface GraphQLResponseWithHttp extends GraphQLResponseWithoutHttp {
//   http: HttpResponse;
// }

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
   * Our only true desire here is that `apollo` implements a method which
   * provides `executeOperation`.
   */
  apollo: ApolloServer,

  /**
   * This should be shaped by the HTTP framework adapter, into the expected
   * interface for this transport.
   */
  httpRequest: HttpRequest,
): Promise<HttpResponse> {

  // Create the shape of the response object. This should populate the response
  // context.
  const responseInit: GraphQLResponse = {
    http: {
      headers: new Headers({
        'content-Type': 'application/json',
      }),
    }
  };

  // Keep the transport-specific context, which we created above, separate.
  const {
    http: transportContext,
    ...responseWithoutHttp
  } = await apollo.executeOperation(httpRequest.parsedRequest, responseInit);

  /**
   * In the future, GraphQL execution should return an `AsyncIterable`. However,
   * today it returns a `Promise`, so we'll therefore coerce it into an
   * `AsyncIterable` through the use of a generator function which is
   * implemented on the `Symbol.asyncIterator` property.
   */
  const body = {
    [Symbol.asyncIterator]: async function*() {
      yield responseWithoutHttp;
    },
  };

  return {
    body,
    // TODO Wrong to default to 200 or empty headers but abandoning this.
    statusCode: transportContext && transportContext.status || 200,
    headers: transportContext && transportContext.headers && {
      ...transportContext.headers,
    } || {},
  };
}
