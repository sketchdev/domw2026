/**
 * Static Site Construct - AWS CDK construct library for hosting static JavaScript sites.
 *
 * This library provides a reusable CDK construct that provisions AWS infrastructure
 * for hosting static websites. It supports two deployment modes:
 *
 * - **SPA Mode** - For single-page applications (React, Vue, Angular) where client-side
 *   routing handles all paths
 * - **Static HTML Mode** - For pre-rendered sites (Next.js static export) where each
 *   route corresponds to a physical HTML file
 *
 * @example
 * ```typescript
 * import { StaticSiteConstruct } from 'static-site-construct';
 *
 * // SPA mode for React/Vue/Angular apps
 * const spaSite = new StaticSiteConstruct(this, 'MySPA', {
 *   domainName: 'app.example.com',
 *   hostedZone: myHostedZone,
 *   isSinglePageApp: true,
 * });
 *
 * // Static HTML mode for Next.js static export
 * const staticSite = new StaticSiteConstruct(this, 'MyStaticSite', {
 *   domainName: 'www.example.com',
 *   hostedZone: myHostedZone,
 *   isSinglePageApp: false,
 * });
 *
 * // Deploy assets to the bucket
 * new BucketDeployment(this, 'DeployAssets', {
 *   sources: [Source.asset('./dist')],
 *   destinationBucket: spaSite.bucket,
 *   distribution: spaSite.distribution,
 *   distributionPaths: ['/*'],
 * });
 * ```
 *
 * @packageDocumentation
 */

// Main construct and props interface
export { StaticSiteConstruct, StaticSiteConstructProps } from './static-site-construct';
