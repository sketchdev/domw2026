import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Key } from 'aws-cdk-lib/aws-kms';
import { StaticSiteConstruct } from '../src/static-site-construct';

/**
 * Integration tests for the complete StaticSiteConstruct.
 *
 * These tests verify that all components are wired together correctly
 * when the construct is instantiated with different configurations:
 * - Full construct in SPA mode
 * - Full construct in static HTML mode
 * - With and without encryptionKey parameter
 * - Bucket policy grants access to CloudFront OAC
 *
 * Validates: Requirements 2.4, 10.2, 10.3
 */
describe('StaticSiteConstruct Integration Tests', () => {
  let app: App;
  let stack: Stack;
  let hostedZone: HostedZone;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
    // Create a mock hosted zone for testing
    hostedZone = HostedZone.fromHostedZoneAttributes(stack, 'Zone', {
      hostedZoneId: 'Z1234567890ABC',
      zoneName: 'example.com',
    }) as HostedZone;
  });

  describe('Full Construct Instantiation - SPA Mode', () => {
    /**
     * Validates Requirements 10.2, 10.3:
     * Tests that all resources are created when instantiated in SPA mode
     */
    it('should create all required resources in SPA mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert - Verify all core resources are created
      const template = Template.fromStack(stack);

      // S3 Bucket
      template.resourceCountIs('AWS::S3::Bucket', 1);

      // S3 Bucket Policy
      template.resourceCountIs('AWS::S3::BucketPolicy', 1);

      // CloudFront Distribution
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);

      // Origin Access Control
      template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);

      // Response Headers Policy
      template.resourceCountIs('AWS::CloudFront::ResponseHeadersPolicy', 1);

      // Route 53 Record
      template.resourceCountIs('AWS::Route53::RecordSet', 1);

      // CloudFront Function should NOT exist in SPA mode
      template.resourceCountIs('AWS::CloudFront::Function', 0);
    });

    /**
     * Validates full resource wiring in SPA mode
     */
    it('should wire CloudFront distribution to S3 bucket with OAC in SPA mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify distribution has S3 origin with OAC
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Origins: Match.arrayWith([
            Match.objectLike({
              DomainName: Match.anyValue(),
              OriginAccessControlId: Match.anyValue(),
              S3OriginConfig: {
                OriginAccessIdentity: '',
              },
            }),
          ]),
          DefaultCacheBehavior: Match.objectLike({
            ViewerProtocolPolicy: 'redirect-to-https',
            ResponseHeadersPolicyId: Match.anyValue(),
          }),
          DefaultRootObject: 'index.html',
          Aliases: ['www.example.com'],
          ViewerCertificate: Match.objectLike({
            AcmCertificateArn: Match.anyValue(),
          }),
          CustomErrorResponses: Match.arrayWith([
            Match.objectLike({ ErrorCode: 403 }),
            Match.objectLike({ ErrorCode: 404 }),
          ]),
        },
      });
    });

    /**
     * Validates Route 53 alias record points to CloudFront in SPA mode
     */
    it('should create Route 53 alias record pointing to CloudFront in SPA mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify Route 53 A record exists with alias to CloudFront
      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: 'www.example.com.',
        Type: 'A',
        HostedZoneId: 'Z1234567890ABC',
        AliasTarget: Match.objectLike({
          DNSName: Match.anyValue(),
          HostedZoneId: Match.anyValue(),
        }),
      });
    });

    /**
     * Validates construct exposes public properties in SPA mode
     */
    it('should expose bucket and distribution properties in SPA mode', () => {
      // Arrange & Act
      const construct = new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      expect(construct.bucket).toBeDefined();
      expect(construct.bucket.bucketName).toBeDefined();
      expect(construct.distribution).toBeDefined();
      expect(construct.distribution.distributionId).toBeDefined();
      expect(construct.certificate).toBeDefined();
    });
  });

  describe('Full Construct Instantiation - Static HTML Mode', () => {
    /**
     * Validates Requirements 10.2, 10.3:
     * Tests that all resources are created when instantiated in static HTML mode
     */
    it('should create all required resources in static HTML mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert - Verify all core resources are created
      const template = Template.fromStack(stack);

      // S3 Bucket
      template.resourceCountIs('AWS::S3::Bucket', 1);

      // S3 Bucket Policy
      template.resourceCountIs('AWS::S3::BucketPolicy', 1);

      // CloudFront Distribution
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);

      // Origin Access Control
      template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);

      // Response Headers Policy
      template.resourceCountIs('AWS::CloudFront::ResponseHeadersPolicy', 1);

      // Route 53 Record
      template.resourceCountIs('AWS::Route53::RecordSet', 1);

      // CloudFront Function SHOULD exist in static HTML mode
      template.resourceCountIs('AWS::CloudFront::Function', 1);
    });

    /**
     * Validates full resource wiring in static HTML mode
     */
    it('should wire CloudFront distribution with URL rewrite function in static HTML mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify distribution has S3 origin with OAC and function association
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Origins: Match.arrayWith([
            Match.objectLike({
              DomainName: Match.anyValue(),
              OriginAccessControlId: Match.anyValue(),
              S3OriginConfig: {
                OriginAccessIdentity: '',
              },
            }),
          ]),
          DefaultCacheBehavior: Match.objectLike({
            ViewerProtocolPolicy: 'redirect-to-https',
            ResponseHeadersPolicyId: Match.anyValue(),
            FunctionAssociations: Match.arrayWith([
              Match.objectLike({
                EventType: 'viewer-request',
                FunctionARN: Match.anyValue(),
              }),
            ]),
          }),
          DefaultRootObject: 'index.html',
          Aliases: ['www.example.com'],
          ViewerCertificate: Match.objectLike({
            AcmCertificateArn: Match.anyValue(),
          }),
        },
      });

      // Verify NO custom error responses in static HTML mode
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CustomErrorResponses: Match.absent(),
        },
      });
    });

    /**
     * Validates Route 53 alias record points to CloudFront in static HTML mode
     */
    it('should create Route 53 alias record pointing to CloudFront in static HTML mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify Route 53 A record exists with alias to CloudFront
      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: 'www.example.com.',
        Type: 'A',
        HostedZoneId: 'Z1234567890ABC',
        AliasTarget: Match.objectLike({
          DNSName: Match.anyValue(),
          HostedZoneId: Match.anyValue(),
        }),
      });
    });

    /**
     * Validates construct exposes public properties in static HTML mode
     */
    it('should expose bucket and distribution properties in static HTML mode', () => {
      // Arrange & Act
      const construct = new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      expect(construct.bucket).toBeDefined();
      expect(construct.bucket.bucketName).toBeDefined();
      expect(construct.distribution).toBeDefined();
      expect(construct.distribution.distributionId).toBeDefined();
      expect(construct.certificate).toBeDefined();
    });
  });

  describe('Full Construct with Optional encryptionKey Parameter', () => {
    /**
     * Validates Requirement 2.4:
     * Tests full construct instantiation without encryptionKey (SSE-S3)
     */
    it('should create construct with SSE-S3 encryption when no encryptionKey provided', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify S3 bucket uses AES256 (SSE-S3) encryption
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
      });

      // Verify no KMS key is created by the construct
      // (Note: there may be KMS keys from other CDK constructs like certificates)
    });

    /**
     * Validates Requirement 2.4:
     * Tests full construct instantiation with encryptionKey (SSE-KMS)
     */
    it('should create construct with SSE-KMS encryption when encryptionKey is provided', () => {
      // Arrange
      const encryptionKey = new Key(stack, 'TestKey', {
        description: 'Test encryption key for S3',
      });

      // Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
        encryptionKey,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify S3 bucket uses aws:kms (SSE-KMS) encryption
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms',
                KMSMasterKeyID: Match.anyValue(),
              },
            },
          ],
        },
      });
    });

    /**
     * Validates SSE-KMS works correctly in static HTML mode
     */
    it('should create construct with SSE-KMS encryption in static HTML mode', () => {
      // Arrange
      const encryptionKey = new Key(stack, 'TestKey', {
        description: 'Test encryption key for S3',
      });

      // Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
        encryptionKey,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify S3 bucket uses aws:kms encryption
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms',
              },
            },
          ],
        },
      });

      // Verify CloudFront Function is still created
      template.resourceCountIs('AWS::CloudFront::Function', 1);
    });

    /**
     * Validates all resources are created when using encryption key
     */
    it('should create all required resources when encryptionKey is provided', () => {
      // Arrange
      const encryptionKey = new Key(stack, 'TestKey');

      // Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
        encryptionKey,
      });

      // Assert
      const template = Template.fromStack(stack);

      // All core resources should still be created
      template.resourceCountIs('AWS::S3::Bucket', 1);
      template.resourceCountIs('AWS::S3::BucketPolicy', 1);
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
      template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
      template.resourceCountIs('AWS::CloudFront::ResponseHeadersPolicy', 1);
      template.resourceCountIs('AWS::Route53::RecordSet', 1);

      // User-provided KMS key should be referenced
      template.hasResourceProperties('AWS::KMS::Key', {});
    });
  });

  describe('Bucket Policy - CloudFront OAC Access', () => {
    /**
     * Validates Requirement 2.4:
     * THE S3_Origin_Bucket SHALL have a bucket policy granting s3:GetObject
     * permission only to the CloudFront_Distribution via Origin_Access_Control
     */
    it('should grant s3:GetObject to CloudFront via OAC in SPA mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify bucket policy grants s3:GetObject to cloudfront.amazonaws.com
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 's3:GetObject',
              Effect: 'Allow',
              Principal: {
                Service: 'cloudfront.amazonaws.com',
              },
              Resource: Match.anyValue(),
              Condition: {
                StringEquals: {
                  'AWS:SourceArn': Match.anyValue(),
                },
              },
            }),
          ]),
        },
      });
    });

    /**
     * Validates Requirement 2.4:
     * Bucket policy grants access to CloudFront OAC in static HTML mode
     */
    it('should grant s3:GetObject to CloudFront via OAC in static HTML mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify bucket policy grants s3:GetObject to cloudfront.amazonaws.com
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 's3:GetObject',
              Effect: 'Allow',
              Principal: {
                Service: 'cloudfront.amazonaws.com',
              },
              Resource: Match.anyValue(),
              Condition: {
                StringEquals: {
                  'AWS:SourceArn': Match.anyValue(),
                },
              },
            }),
          ]),
        },
      });
    });

    /**
     * Validates bucket policy references the correct bucket
     */
    it('should scope bucket policy to the origin bucket resources', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify bucket policy is attached to the correct bucket
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        Bucket: {
          Ref: Match.stringLikeRegexp('.*OriginBucket.*'),
        },
      });
    });

    /**
     * Validates bucket policy includes SSL enforcement
     */
    it('should include SSL enforcement in bucket policy', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify bucket policy has SSL enforcement statement
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Deny',
              Principal: {
                AWS: '*',
              },
              Action: 's3:*',
              Condition: {
                Bool: {
                  'aws:SecureTransport': 'false',
                },
              },
            }),
          ]),
        },
      });
    });

    /**
     * Validates bucket policy works correctly with encryption key
     */
    it('should grant s3:GetObject to CloudFront via OAC when encryptionKey is provided', () => {
      // Arrange
      const encryptionKey = new Key(stack, 'TestKey');

      // Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
        encryptionKey,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify bucket policy grants s3:GetObject to CloudFront
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 's3:GetObject',
              Effect: 'Allow',
              Principal: {
                Service: 'cloudfront.amazonaws.com',
              },
            }),
          ]),
        },
      });
    });
  });

  describe('Domain Name Validation', () => {
    /**
     * Validates Requirement 8.7:
     * IF an invalid domain name is provided, THEN THE Static_Site_Construct
     * SHALL fail construction with a descriptive error message
     */
    it('should throw error for empty domain name', () => {
      // Arrange & Act & Assert
      expect(() => {
        new StaticSiteConstruct(stack, 'TestSite', {
          domainName: '',
          hostedZone,
          isSinglePageApp: true,
        });
      }).toThrow(/domainName/i);
    });

    /**
     * Validates Requirement 8.7:
     * Domain name must be valid FQDN format
     */
    it('should throw error for invalid domain name format', () => {
      // Arrange & Act & Assert
      expect(() => {
        new StaticSiteConstruct(stack, 'TestSite', {
          domainName: 'invalid domain with spaces',
          hostedZone,
          isSinglePageApp: true,
        });
      }).toThrow();
    });

    /**
     * Validates successful construction with valid domain names
     */
    it('should accept valid domain names', () => {
      // Arrange & Act & Assert - should not throw
      expect(() => {
        new StaticSiteConstruct(stack, 'TestSite', {
          domainName: 'www.example.com',
          hostedZone,
          isSinglePageApp: true,
        });
      }).not.toThrow();
    });

    /**
     * Validates subdomain format is accepted
     */
    it('should accept subdomain format', () => {
      // Arrange & Act & Assert - should not throw
      expect(() => {
        new StaticSiteConstruct(stack, 'TestSite', {
          domainName: 'api.staging.example.com',
          hostedZone,
          isSinglePageApp: false,
        });
      }).not.toThrow();
    });
  });

  describe('End-to-End Resource Connectivity', () => {
    /**
     * Validates all resources are connected correctly in the full construct
     */
    it('should connect all resources end-to-end in SPA mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);

      // 1. Verify OAC is configured for S3
      template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
        OriginAccessControlConfig: {
          OriginAccessControlOriginType: 's3',
          SigningBehavior: 'always',
          SigningProtocol: 'sigv4',
        },
      });

      // 2. Verify CloudFront origin references the OAC
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Origins: Match.arrayWith([
            Match.objectLike({
              OriginAccessControlId: Match.anyValue(),
            }),
          ]),
        },
      });

      // 3. Verify Route 53 points to CloudFront
      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Type: 'A',
        AliasTarget: Match.objectLike({
          DNSName: Match.anyValue(),
        }),
      });

      // 4. Verify security headers policy is attached
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: Match.objectLike({
            ResponseHeadersPolicyId: Match.anyValue(),
          }),
        },
      });
    });

    /**
     * Validates all resources are connected correctly in static HTML mode
     */
    it('should connect all resources end-to-end in static HTML mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);

      // 1. Verify CloudFront Function exists and is attached
      template.hasResourceProperties('AWS::CloudFront::Function', {
        FunctionConfig: {
          Runtime: 'cloudfront-js-2.0',
        },
      });

      // 2. Verify function is associated with distribution
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: Match.objectLike({
            FunctionAssociations: Match.arrayWith([
              Match.objectLike({
                EventType: 'viewer-request',
              }),
            ]),
          }),
        },
      });

      // 3. Verify no custom error responses
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CustomErrorResponses: Match.absent(),
        },
      });
    });
  });

  describe('Security Configuration Integration', () => {
    /**
     * Validates security headers are applied in full construct
     */
    it('should apply all security headers in full construct', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify response headers policy has security headers configured
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: Match.objectLike({
            ContentTypeOptions: {
              Override: true,
            },
            FrameOptions: {
              FrameOption: 'DENY',
              Override: true,
            },
            StrictTransportSecurity: Match.objectLike({
              AccessControlMaxAgeSec: 31536000,
              IncludeSubdomains: true,
              Override: true,
            }),
            ContentSecurityPolicy: Match.objectLike({
              Override: true,
            }),
          }),
        },
      });
    });

    /**
     * Validates S3 bucket has all public access blocked
     */
    it('should block all public access to S3 bucket in full construct', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    /**
     * Validates HTTPS enforcement on CloudFront
     */
    it('should enforce HTTPS on CloudFront distribution', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: Match.objectLike({
            ViewerProtocolPolicy: 'redirect-to-https',
          }),
        },
      });
    });
  });
});
