/**
 * CloudFront Function for URL rewriting in Static HTML mode.
 *
 * This module provides both a testable handler function for property-based testing
 * and a string constant containing the CloudFront Function source code for use
 * in the CDK construct.
 *
 * The function transforms clean URLs to their corresponding HTML files:
 * - "/" → "/index.html" (root path)
 * - "/about/" → "/about/index.html" (directory paths)
 * - "/about" → "/about.html" (paths without extensions)
 * - "/style.css" → "/style.css" (paths with extensions unchanged)
 */

/**
 * CloudFront Function event structure for viewer-request events.
 */
export interface CloudFrontFunctionEvent {
  request: {
    uri: string;
    [key: string]: unknown;
  };
}

/**
 * CloudFront Function response structure.
 */
export interface CloudFrontFunctionResult {
  request: {
    uri: string;
    [key: string]: unknown;
  };
}

/**
 * URL rewrite handler function for Static HTML mode.
 *
 * This function implements clean URL handling for pre-rendered static sites
 * like Next.js static export. It transforms incoming URIs to their corresponding
 * HTML files following these rules:
 *
 * Rule 1: Root path "/" becomes "/index.html"
 * Rule 2: Paths ending with "/" get "index.html" appended
 * Rule 3: Paths without extension get ".html" appended
 * Rule 4: Paths with extensions pass through unchanged
 *
 * @param event - The CloudFront Function viewer-request event
 * @returns The modified request with rewritten URI
 *
 * @example
 * ```typescript
 * // Root path
 * urlRewriteHandler({ request: { uri: '/' } });
 * // Returns: { request: { uri: '/index.html' } }
 *
 * // Directory path
 * urlRewriteHandler({ request: { uri: '/about/' } });
 * // Returns: { request: { uri: '/about/index.html' } }
 *
 * // Extension-less path
 * urlRewriteHandler({ request: { uri: '/about' } });
 * // Returns: { request: { uri: '/about.html' } }
 *
 * // Path with extension (unchanged)
 * urlRewriteHandler({ request: { uri: '/style.css' } });
 * // Returns: { request: { uri: '/style.css' } }
 * ```
 */
export function urlRewriteHandler(event: CloudFrontFunctionEvent): CloudFrontFunctionResult {
  const request = event.request;
  const uri = request.uri;

  // Rule 1: Root path "/" becomes "/index.html"
  if (uri === '/') {
    return {
      request: {
        ...request,
        uri: '/index.html',
      },
    };
  }

  // Rule 2: Paths ending with "/" get "index.html" appended
  // Example: "/about/" → "/about/index.html"
  if (uri.endsWith('/')) {
    return {
      request: {
        ...request,
        uri: uri + 'index.html',
      },
    };
  }

  // Rule 3 & 4: Check if the final path segment contains an extension
  // Extract the last segment of the path (everything after the final "/")
  const lastSlashIndex = uri.lastIndexOf('/');
  const lastSegment = uri.substring(lastSlashIndex + 1);

  // Rule 3: Paths with extensions pass through unchanged
  // If the final segment contains a "." character, assume it has an extension.
  // Example: "/style.css" remains "/style.css"
  // Example: "/api/v1.2/data" remains "/api/v1.2/data"
  if (lastSegment.indexOf('.') !== -1) {
    return {
      request: {
        ...request,
        uri: uri,
      },
    };
  }

  // Rule 4: Paths without extension get ".html" appended
  // This enables clean URLs for static HTML pages.
  // Example: "/about" → "/about.html"
  return {
    request: {
      ...request,
      uri: uri + '.html',
    },
  };
}

/**
 * CloudFront Function source code for URL rewriting in Static HTML mode.
 *
 * This string constant contains the JavaScript source code to be deployed
 * as a CloudFront Function. It implements the same logic as urlRewriteHandler
 * but in the cloudfront-js-2.0 runtime format.
 *
 * The function is deployed to CloudFront edge locations and executes on
 * viewer-request events to rewrite URIs before the origin fetch.
 */
export const URL_REWRITE_FUNCTION_CODE = `
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri === '/') {
    request.uri = '/index.html';
    return request;
  }

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
    return request;
  }

  var lastSlashIndex = uri.lastIndexOf('/');
  var lastSegment = uri.substring(lastSlashIndex + 1);

  if (lastSegment.indexOf('.') === -1) {
    request.uri = uri + '.html';
  }

  return request;
}
`;
