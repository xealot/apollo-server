import { ApolloServer } from "../../index";
import { GraphQLRequest, GraphQLResponse } from '../../execution';
import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';

/**
 * The existing `GraphQLRequest` and `GraphQLResponse` type includes `http`.
 * Going forward, however, the `http` definition will change and live within
 * the transport implementation.  Therefore, first we will use the existing
 * types, omit their `http` properties, and then re-extend them with new
 * implementations.
 */
type GraphQLRequestWithoutHttp = Omit<GraphQLRequest, 'http'>
type GraphQLResponseWithoutHttp = Omit<GraphQLResponse, 'http'>

// interface GraphQLRequestWithHttp extends GraphQLRequestWithoutHttp {
//   http: HttpRequest;
// }

// interface GraphQLResponseWithHttp extends GraphQLResponseWithoutHttp {
//   http: HttpResponse;
// }

interface GraphQLResponseInitWithHttp extends GraphQLResponseWithoutHttp {
  http: Partial<HttpResponse>;
}

export interface HttpRequest {
  method: string;
  headers: IncomingHttpHeaders;
  url?: string;
  // TODO body!
  parsedRequest: GraphQLRequestWithoutHttp,
}

export interface HttpResponse {
  statusCode: number;
  statusMessage?: string;
  body: AsyncIterable<GraphQLResponseWithoutHttp>;
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

  // Create the shape of the response object. This should populate the request
  // context.
  const responseInit: GraphQLResponseInitWithHttp = {
    http: {
      headers: {
        'Content-Type': 'application/json',
      }
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

  console.error(transportContext);

  return {
    body,
    statusCode: 200,
    headers: {
    },
  };
}

/**
 * handler module
 */
