import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  Distribution,
  ErrorResponse,
  Function as CloudFrontFunction,
  FunctionAssociation,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  HeadersFrameOption,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { ARecord, IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { validateDomainName } from './validation';
import { URL_REWRITE_FUNCTION_CODE } from './cloudfront-function';
import type { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';

/**
 * Configuration properties for the StaticSiteConstruct.
 * 
 * @example
 * const site = new StaticSiteConstruct(this, 'MySite', {
 *   domainName: 'www.example.com',
 *   hostedZone: myHostedZone,
 *   isSinglePageApp: true,
 * });
 */
export interface StaticSiteConstructProps {
  /**
   * The fully qualified domain name for the static site.
   * Must be a valid FQDN format with length between 1 and 253 characters.
   * 
   * @example 'www.example.com'
   */
  readonly domainName: string;

  /**
   * The Route 53 hosted zone where DNS records will be created.
   * The hosted zone must already exist and be configured for the domain.
   */
  readonly hostedZone: IHostedZone;

  /**
   * Determines the deployment mode for the static site.
   * 
   * When `true` (SPA Mode):
   * - CloudFront returns index.html for 403/404 errors
   * - Enables client-side routing for React, Vue, Angular apps
   * - No CloudFront Function is created
   * 
   * When `false` (Static HTML Mode):
   * - CloudFront Function rewrites clean URLs to .html files
   * - Designed for pre-rendered sites like Next.js static export
   * - 403/404 errors are returned as-is
   */
  readonly isSinglePageApp: boolean;

  /**
   * Optional KMS Customer Master Key for S3 bucket encryption.
   * 
   * When provided, the S3 bucket uses SSE-KMS encryption with this key.
   * When omitted, the S3 bucket uses SSE-S3 (AES-256) encryption.
   * 
   * @default SSE-S3 encryption (AES-256)
   */
  readonly encryptionKey?: IKey;
}

/**
 * A CDK construct that provisions AWS infrastructure for hosting static websites.
 * 
 * This construct creates:
 * - An S3 bucket for storing static assets with encryption and public access blocked
 * - A CloudFront distribution for global content delivery
 * - An ACM certificate for HTTPS (provisioned in us-east-1)
 * - A Route 53 alias record pointing to the CloudFront distribution
 * - Security headers policy with modern security defaults
 * - (Static HTML mode only) A CloudFront Function for clean URL handling
 * 
 * @example
 * const site = new StaticSiteConstruct(this, 'MySite', {
 *   domainName: 'www.example.com',
 *   hostedZone: myHostedZone,
 *   isSinglePageApp: true,
 * });
 * 
 * // Deploy assets to the bucket
 * new BucketDeployment(this, 'DeployAssets', {
 *   sources: [Source.asset('./dist')],
 *   destinationBucket: site.bucket,
 *   distribution: site.distribution,
 *   distributionPaths: ['/*'],
 * });
 */
export class StaticSiteConstruct extends Construct {
  /**
   * The S3 bucket storing the static site assets.
   * Use this to deploy content via BucketDeployment or other mechanisms.
   */
  public readonly bucket: Bucket;

  /**
   * The CloudFront distribution serving the static site.
   * Use this to configure cache invalidations or access distribution properties.
   */
  public readonly distribution: Distribution;

  /**
   * The ACM certificate for HTTPS.
   * Provisioned in us-east-1 as required by CloudFront.
   */
  public readonly certificate: ICertificate;

  /**
   * The security headers policy for CloudFront.
   * Includes X-Content-Type-Options, X-Frame-Options, HSTS, and CSP headers.
   */
  private readonly securityHeadersPolicy: ResponseHeadersPolicy;

  constructor(scope: Construct, id: string, props: StaticSiteConstructProps) {
    super(scope, id);

    // Validate domain name at construction time (fail fast)
    validateDomainName(props.domainName);

    // Create S3 origin bucket with conditional encryption
    // SSE-KMS if encryptionKey provided, otherwise SSE-S3 (AES-256)
    this.bucket = new Bucket(this, 'OriginBucket', {
      encryption: props.encryptionKey 
        ? BucketEncryption.KMS 
        : BucketEncryption.S3_MANAGED,
      encryptionKey: props.encryptionKey,

      // Block all public access (enables all four public access block settings)
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,

      // Enforce SSL for all requests to the bucket
      enforceSSL: true,

      // Auto-delete objects when stack is destroyed (for dev/test environments)
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create ACM certificate in us-east-1
    // Uses DNS validation via the provided hosted zone for automated certificate issuance
    // Note: DnsValidatedCertificate is deprecated but is the only CDK construct that supports cross-region certificate provisioning
    this.certificate = new DnsValidatedCertificate(this, 'Certificate', {
      domainName: props.domainName,
      hostedZone: props.hostedZone,
      // CloudFront requires certificates to be in us-east-1 regardless of stack region
      region: 'us-east-1',
      // Clean up DNS validation records when certificate is deleted
      cleanupRoute53Records: true,
    });

    // Create security headers policy for CloudFront
    this.securityHeadersPolicy = new ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
      securityHeadersBehavior: {
        // Prevent MIME type sniffing
        contentTypeOptions: {
          override: true,
        },

        // Deny iframe embedding
        frameOptions: {
          frameOption: HeadersFrameOption.DENY,
          override: true,
        },

        // Enforce HTTPS for 1 year
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365),
          includeSubdomains: true,
          override: true,
        },

        // Content Security Policy
        contentSecurityPolicy: {
          contentSecurityPolicy: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';",
          override: true,
        },
      },
    });

    // Configure custom error responses for SPA mode
    // When isSinglePageApp is true, 403 and 404 errors return index.html with 200 status
    // This enables client-side routing for React, Vue, Angular apps
    const errorResponses: ErrorResponse[] | undefined = props.isSinglePageApp
      ? [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: Duration.seconds(0),
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: Duration.seconds(0),
          },
        ]
      : undefined;

    // Create CloudFront Function for Static HTML mode URL rewriting
    // When isSinglePageApp is false, this function handles clean URL to HTML file mapping:
    // - "/" → "/index.html"
    // - "/about/" → "/about/index.html" 
    // - "/about" → "/about.html"
    // - "/style.css" → "/style.css" (unchanged)
    // The function is NOT created for SPA mode where client-side routing handles all paths
    let functionAssociations: FunctionAssociation[] | undefined;

    if (!props.isSinglePageApp) {
      const urlRewriteFunction = new CloudFrontFunction(this, 'UrlRewriteFunction', {
        runtime: FunctionRuntime.JS_2_0,
        // Import the URL rewrite function code from cloudfront-function.ts
        code: FunctionCode.fromInline(URL_REWRITE_FUNCTION_CODE),
        comment: 'URL rewrite function for static HTML mode - transforms clean URLs to .html files',
      });

      // Transform URIs before origin fetch with viewer-request event type
      functionAssociations = [
        {
          function: urlRewriteFunction,
          eventType: FunctionEventType.VIEWER_REQUEST,
        },
      ];
    }

    this.distribution = new Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: this.securityHeadersPolicy,
        functionAssociations,
      },
      defaultRootObject: 'index.html',
      domainNames: [props.domainName],
      certificate: this.certificate,
      errorResponses,
    });

    // Create Route 53 alias pointing to CloudFront distribution
    new ARecord(this, 'AliasRecord', {
      zone: props.hostedZone,
      recordName: props.domainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
    });
  }
}
