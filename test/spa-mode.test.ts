import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Key } from 'aws-cdk-lib/aws-kms';
import { StaticSiteConstruct } from '../src/static-site-construct';

/**
 * Unit tests for SPA (Single Page Application) mode configuration.
 * 
 * These tests verify that when isSinglePageApp is true:
 * - Custom error responses are configured for 403 → index.html (200)
 * - Custom error responses are configured for 404 → index.html (200)
 * - CloudFront Function is NOT created (client-side routing handles all paths)
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 10.5, 10.7
 */
describe('SPA Mode Configuration', () => {
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

  describe('Custom Error Responses', () => {
    /**
     * Validates Requirement 6.1:
     * WHEN isSinglePageApp is true, THE CloudFront_Distribution SHALL return index.html
     * with HTTP status 200 for 403 errors
     */
    it('should configure custom error response for 403 → index.html (200)', () => {
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
          CustomErrorResponses: Match.arrayWith([
            Match.objectLike({
              ErrorCode: 403,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
              ErrorCachingMinTTL: 0,
            }),
          ]),
        },
      });
    });

    /**
     * Validates Requirement 6.2:
     * WHEN isSinglePageApp is true, THE CloudFront_Distribution SHALL return index.html
     * with HTTP status 200 for 404 errors
     */
    it('should configure custom error response for 404 → index.html (200)', () => {
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
          CustomErrorResponses: Match.arrayWith([
            Match.objectLike({
              ErrorCode: 404,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
              ErrorCachingMinTTL: 0,
            }),
          ]),
        },
      });
    });

    /**
     * Validates Requirements 6.3 and 6.4:
     * WHEN isSinglePageApp is true, THE error response TTL SHALL be set to 0 seconds
     * to ensure fresh routing decisions
     */
    it('should set error response TTL to 0 seconds for both 403 and 404', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Verify both error responses have TTL of 0
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CustomErrorResponses: Match.arrayWith([
            Match.objectLike({
              ErrorCode: 403,
              ErrorCachingMinTTL: 0,
            }),
            Match.objectLike({
              ErrorCode: 404,
              ErrorCachingMinTTL: 0,
            }),
          ]),
        },
      });
    });

    /**
     * Verifies that exactly two custom error responses are configured in SPA mode
     */
    it('should configure exactly two custom error responses (403 and 404)', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      const distribution = template.findResources('AWS::CloudFront::Distribution');
      const distributionKey = Object.keys(distribution)[0];
      const customErrorResponses = distribution[distributionKey].Properties.DistributionConfig.CustomErrorResponses;
      
      expect(customErrorResponses).toHaveLength(2);
    });
  });

  describe('CloudFront Function', () => {
    /**
     * Validates Requirement 6.4 / 10.7:
     * WHEN isSinglePageApp is true, THE construct SHALL NOT create a CloudFront Function
     * (URL rewriting is not needed because client-side routing handles all paths)
     */
    it('should NOT create CloudFront Function in SPA mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Verify no CloudFront Function resources are created
      template.resourceCountIs('AWS::CloudFront::Function', 0);
    });

    /**
     * Verifies that the distribution default behavior has no function associations in SPA mode
     */
    it('should NOT have function associations on default behavior in SPA mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Verify the distribution default behavior does NOT have FunctionAssociations
      // (FunctionAssociations should be absent or undefined)
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: Match.objectLike({
            FunctionAssociations: Match.absent(),
          }),
        },
      });
    });
  });

  describe('Comparison with Static HTML Mode', () => {
    /**
     * Verifies that static HTML mode does NOT have custom error responses
     * (errors are returned as-is)
     */
    it('should NOT configure custom error responses in static HTML mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Verify CustomErrorResponses is absent in static HTML mode
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CustomErrorResponses: Match.absent(),
        },
      });
    });

    /**
     * Verifies that static HTML mode DOES create a CloudFront Function
     * (for URL rewriting from clean URLs to .html files)
     */
    it('should create CloudFront Function in static HTML mode (contrast with SPA)', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Verify CloudFront Function IS created in static HTML mode
      template.resourceCountIs('AWS::CloudFront::Function', 1);
    });
  });

  describe('SPA Mode with Optional Parameters', () => {
    /**
     * Verifies custom error responses are configured when using encryption key
     */
    it('should still configure custom error responses when encryptionKey is provided', () => {
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
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CustomErrorResponses: Match.arrayWith([
            Match.objectLike({
              ErrorCode: 403,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
            }),
            Match.objectLike({
              ErrorCode: 404,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
            }),
          ]),
        },
      });
    });

    /**
     * Verifies no CloudFront Function is created even with encryption key
     */
    it('should NOT create CloudFront Function when encryptionKey is provided in SPA mode', () => {
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
      template.resourceCountIs('AWS::CloudFront::Function', 0);
    });
  });
});
