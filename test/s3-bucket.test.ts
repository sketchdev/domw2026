import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Key } from 'aws-cdk-lib/aws-kms';
import { StaticSiteConstruct } from '../src/static-site-construct';

/**
 * Unit tests for S3 Origin Bucket configuration.
 * 
 * These tests verify that the S3 bucket is created with:
 * - Correct encryption settings (SSE-S3 or SSE-KMS)
 * - All public access block settings enabled
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 10.2
 */
describe('S3 Origin Bucket', () => {
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

  describe('Encryption', () => {
    /**
     * Validates Requirement 2.1:
     * WHEN the Static_Site_Construct is instantiated without an encryptionKey parameter,
     * THE S3_Origin_Bucket SHALL be created with server-side encryption enabled using
     * SSE-S3 (AES-256) as the default encryption algorithm
     */
    it('should create bucket with SSE-S3 (AES-256) encryption when no encryptionKey provided', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
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
    });

    /**
     * Validates Requirement 2.2:
     * WHEN the Static_Site_Construct is instantiated with an encryptionKey parameter,
     * THE S3_Origin_Bucket SHALL be created with server-side encryption enabled using
     * SSE-KMS with the provided Customer Master Key (CMK)
     */
    it('should create bucket with SSE-KMS encryption when encryptionKey is provided', () => {
      // Arrange
      const kmsKey = new Key(stack, 'TestKey', {
        description: 'Test encryption key',
      });

      // Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
        encryptionKey: kmsKey,
      });

      // Assert
      const template = Template.fromStack(stack);
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
     * Verifies that when SSE-KMS is used, the key reference is correctly set
     */
    it('should reference the provided KMS key for encryption', () => {
      // Arrange
      const kmsKey = new Key(stack, 'TestKey', {
        description: 'Test encryption key',
      });

      // Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
        encryptionKey: kmsKey,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Verify KMS key exists in the template
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: 'Test encryption key',
      });

      // Verify bucket references a KMS key
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms',
                KMSMasterKeyID: {
                  'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('TestKey.*'), 'Arn']),
                },
              },
            },
          ],
        },
      });
    });
  });

  describe('Public Access Block', () => {
    /**
     * Validates Requirement 2.3:
     * WHEN the Static_Site_Construct is instantiated, THE S3_Origin_Bucket SHALL be
     * configured to block all public access by enabling BlockPublicAcls, IgnorePublicAcls,
     * BlockPublicPolicy, and RestrictPublicBuckets settings
     */
    it('should block all public access with all four settings enabled', () => {
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
     * Verifies public access block is enabled regardless of deployment mode (SPA)
     */
    it('should block all public access in SPA mode', () => {
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
     * Verifies public access block is enabled regardless of deployment mode (Static HTML)
     */
    it('should block all public access in static HTML mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
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
  });

  describe('Bucket Properties', () => {
    /**
     * Verifies that exactly one S3 bucket is created by the construct
     */
    it('should create exactly one S3 bucket', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::S3::Bucket', 1);
    });

    /**
     * Verifies the bucket is exposed as a public property
     */
    it('should expose the bucket as a public readonly property', () => {
      // Arrange & Act
      const construct = new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      expect(construct.bucket).toBeDefined();
      expect(construct.bucket.bucketName).toBeDefined();
    });
  });
});
