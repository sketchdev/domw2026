import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { StaticSiteConstruct } from '../src/static-site-construct';

/**
 * Unit tests for CloudFront Distribution configuration.
 * 
 * These tests verify that the CloudFront distribution is created with:
 * - S3 bucket configured as origin
 * - Origin Access Control (OAC) for secure S3 access
 * - Default root object set to "index.html"
 * - Response headers policy attached
 * 
 * Validates: Requirements 4.1, 4.2, 4.5, 10.3
 */
describe('CloudFront Distribution', () => {
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

  describe('S3 Origin Configuration', () => {
    /**
     * Validates Requirement 4.1:
     * WHEN the Static_Site_Construct is instantiated, THE CloudFront_Distribution
     * SHALL be created with the S3_Origin_Bucket as its origin
     */
    it('should create distribution with S3 bucket as origin', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Verify CloudFront distribution exists
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Origins: Match.arrayWith([
            Match.objectLike({
              // S3 bucket origin is identified by the S3OriginConfig or DomainName pattern
              DomainName: Match.anyValue(),
              Id: Match.anyValue(),
              S3OriginConfig: Match.anyValue(),
            }),
          ]),
        },
      });
    });

    /**
     * Verifies that exactly one CloudFront distribution is created
     */
    it('should create exactly one CloudFront distribution', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    });
  });

  describe('Origin Access Control', () => {
    /**
     * Validates Requirement 4.2:
     * WHEN the Static_Site_Construct is instantiated, THE CloudFront_Distribution
     * SHALL use Origin_Access_Control to access the S3_Origin_Bucket
     */
    it('should create Origin Access Control resource', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Verify OAC is created with correct configuration
      template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
        OriginAccessControlConfig: {
          OriginAccessControlOriginType: 's3',
          SigningBehavior: 'always',
          SigningProtocol: 'sigv4',
        },
      });
    });

    /**
     * Verifies that the CloudFront distribution references the OAC
     */
    it('should associate Origin Access Control with the distribution origin', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Verify the distribution origin has OriginAccessControlId set
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Origins: Match.arrayWith([
            Match.objectLike({
              OriginAccessControlId: Match.anyValue(),
            }),
          ]),
        },
      });
    });

    /**
     * Validates Requirement 2.4:
     * THE S3_Origin_Bucket SHALL have a bucket policy granting s3:GetObject permission
     * only to the CloudFront_Distribution via Origin_Access_Control
     */
    it('should create bucket policy granting access to CloudFront via OAC', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Verify bucket policy exists and grants s3:GetObject
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 's3:GetObject',
              Effect: 'Allow',
              Principal: {
                Service: 'cloudfront.amazonaws.com',
              },
              Condition: {
                StringEquals: Match.anyValue(),
              },
            }),
          ]),
        },
      });
    });
  });

  describe('Default Root Object', () => {
    /**
     * Validates Requirement 4.5:
     * THE CloudFront_Distribution SHALL have a default root object set to "index.html"
     */
    it('should set default root object to index.html', () => {
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
          DefaultRootObject: 'index.html',
        },
      });
    });

    /**
     * Verifies default root object is set in both SPA and static HTML modes
     */
    it('should set default root object to index.html in static HTML mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultRootObject: 'index.html',
        },
      });
    });
  });

  describe('Response Headers Policy', () => {
    /**
     * Validates Requirement 5.1:
     * WHEN the Static_Site_Construct is instantiated, THE CloudFront_Distribution
     * SHALL have a Security_Headers_Policy attached
     */
    it('should attach response headers policy to distribution', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Verify the distribution default behavior has a response headers policy
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: Match.objectLike({
            ResponseHeadersPolicyId: Match.anyValue(),
          }),
        },
      });
    });

    /**
     * Verifies that a ResponseHeadersPolicy resource is created
     */
    it('should create a response headers policy resource', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::CloudFront::ResponseHeadersPolicy', 1);
    });

    /**
     * Verifies response headers policy is attached in static HTML mode as well
     */
    it('should attach response headers policy in static HTML mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: Match.objectLike({
            ResponseHeadersPolicyId: Match.anyValue(),
          }),
        },
      });
    });
  });

  describe('Viewer Protocol Policy', () => {
    /**
     * Verifies that the distribution redirects HTTP to HTTPS for secure connections
     */
    it('should redirect HTTP to HTTPS', () => {
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

  describe('Domain and Certificate Configuration', () => {
    /**
     * Validates Requirement 4.3:
     * WHEN the Static_Site_Construct is instantiated with a domain name,
     * THE CloudFront_Distribution SHALL be configured with the ACM_Certificate for HTTPS
     */
    it('should configure distribution with custom domain name', () => {
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
          Aliases: ['www.example.com'],
        },
      });
    });

    /**
     * Verifies that the distribution has a certificate attached
     */
    it('should attach ACM certificate to distribution', () => {
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
          ViewerCertificate: Match.objectLike({
            AcmCertificateArn: Match.anyValue(),
            SslSupportMethod: 'sni-only',
            MinimumProtocolVersion: Match.anyValue(),
          }),
        },
      });
    });
  });

  describe('Construct Properties', () => {
    /**
     * Validates Requirement 8.6:
     * THE Static_Site_Construct SHALL expose the created CloudFront_Distribution
     * as a public readonly property
     */
    it('should expose the distribution as a public readonly property', () => {
      // Arrange & Act
      const construct = new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      expect(construct.distribution).toBeDefined();
      expect(construct.distribution.distributionId).toBeDefined();
    });

    /**
     * Verifies the bucket property is also exposed
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
    });
  });
});
