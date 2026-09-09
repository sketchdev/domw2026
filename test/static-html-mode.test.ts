import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { StaticSiteConstruct } from '../src/static-site-construct';

/**
 * Unit tests for Static HTML Mode configuration.
 *
 * These tests verify that when isSinglePageApp is set to false:
 * - CloudFront Function is created with cloudfront-js-2.0 runtime
 * - Function is associated on viewer-request event type
 * - NO custom error responses are configured for 403/404
 */
describe('Static HTML Mode', () => {
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

  describe('CloudFront Function Creation', () => {
    /**
     * WHEN the Static_Site_Construct is instantiated with the isSinglePageApp
     * parameter set to false, THE CloudFront_Function SHALL be created with
     * a runtime of cloudfront-js-2.0
     */
    it('should create CloudFront Function with cloudfront-js-2.0 runtime', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify CloudFront Function is created with cloudfront-js-2.0 runtime
      template.hasResourceProperties('AWS::CloudFront::Function', {
        FunctionConfig: {
          Runtime: 'cloudfront-js-2.0',
        },
      });
    });

    /**
     * Verifies that exactly one CloudFront Function is created in static HTML mode
     */
    it('should create exactly one CloudFront Function', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::CloudFront::Function', 1);
    });

    /**
     * Verifies CloudFront Function has comment describing its purpose
     */
    it('should create CloudFront Function with descriptive comment', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify CloudFront Function has a comment configured
      template.hasResourceProperties('AWS::CloudFront::Function', {
        FunctionConfig: {
          Comment: Match.stringLikeRegexp('.*URL.*rewrite.*'),
        },
      });
    });

    /**
     * Verifies CloudFront Function code is included
     */
    it('should create CloudFront Function with inline code', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify CloudFront Function has function code
      template.hasResourceProperties('AWS::CloudFront::Function', {
        FunctionCode: Match.stringLikeRegexp('.*function handler.*'),
      });
    });
  });

  describe('Function Association', () => {
    /**
     * WHEN the Static_Site_Construct is instantiated with the isSinglePageApp
     * parameter set to false, THE CloudFront_Function SHALL be associated with
     * the CloudFront_Distribution on the viewer-request event type
     */
    it('should associate CloudFront Function on viewer-request event type', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify the distribution default behavior has function association on viewer-request
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: Match.objectLike({
            FunctionAssociations: Match.arrayWith([
              Match.objectLike({
                EventType: 'viewer-request',
                FunctionARN: Match.anyValue(),
              }),
            ]),
          }),
        },
      });
    });

    /**
     * Verifies that exactly one function association exists
     */
    it('should have exactly one function association', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Get the distribution and verify function associations array length
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: Match.objectLike({
            FunctionAssociations: Match.arrayEquals([
              Match.objectLike({
                EventType: 'viewer-request',
                FunctionARN: Match.anyValue(),
              }),
            ]),
          }),
        },
      });
    });
  });

  describe('Custom Error Responses', () => {
    /**
     * WHEN the Static_Site_Construct is instantiated with the isSinglePageApp
     * parameter set to false, THE CloudFront_Distribution SHALL NOT configure
     * custom error responses for HTTP 403 or HTTP 404 status codes
     */
    it('should NOT configure custom error responses for 403', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);
      const distributionResources = template.findResources('AWS::CloudFront::Distribution');

      // Verify that no custom error responses exist for 403
      for (const [, resource] of Object.entries(distributionResources)) {
        const customErrorResponses = resource.Properties?.DistributionConfig?.CustomErrorResponses;
        if (customErrorResponses) {
          const has403Response = customErrorResponses.some(
            (response: { ErrorCode: number }) => response.ErrorCode === 403
          );
          expect(has403Response).toBe(false);
        }
      }
    });

    /**
     * Verifies no custom error response for 404 in static HTML mode
     */
    it('should NOT configure custom error responses for 404', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);
      const distributionResources = template.findResources('AWS::CloudFront::Distribution');

      // Verify that no custom error responses exist for 404
      for (const [, resource] of Object.entries(distributionResources)) {
        const customErrorResponses = resource.Properties?.DistributionConfig?.CustomErrorResponses;
        if (customErrorResponses) {
          const has404Response = customErrorResponses.some(
            (response: { ErrorCode: number }) => response.ErrorCode === 404
          );
          expect(has404Response).toBe(false);
        }
      }
    });

    /**
     * Verifies no custom error responses are configured at all
     */
    it('should have no custom error responses configured', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);
      const distributionResources = template.findResources('AWS::CloudFront::Distribution');

      // Verify that CustomErrorResponses is either absent or empty
      for (const [, resource] of Object.entries(distributionResources)) {
        const customErrorResponses = resource.Properties?.DistributionConfig?.CustomErrorResponses;
        // CustomErrorResponses should be undefined or an empty array
        expect(customErrorResponses === undefined || customErrorResponses.length === 0).toBe(true);
      }
    });
  });

  describe('Contrast with SPA Mode', () => {
    /**
     * WHEN isSinglePageApp is set to false, THE unit tests SHALL verify that
     * the CloudFront_Function is created and associated with the CloudFront_Distribution
     * on the viewer-request event type
     *
     * This test verifies the contrast - SPA mode should NOT create the function
     */
    it('should NOT create CloudFront Function when isSinglePageApp is true', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::CloudFront::Function', 0);
    });

    /**
     * Verifies SPA mode does NOT have function associations (contrast test)
     */
    it('should NOT have function associations when isSinglePageApp is true', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      const distributionResources = template.findResources('AWS::CloudFront::Distribution');

      // Verify that FunctionAssociations is either absent or empty for SPA mode
      for (const [, resource] of Object.entries(distributionResources)) {
        const functionAssociations =
          resource.Properties?.DistributionConfig?.DefaultCacheBehavior?.FunctionAssociations;
        expect(functionAssociations === undefined || functionAssociations.length === 0).toBe(true);
      }
    });

    /**
     * Verifies SPA mode has custom error responses (contrast test)
     */
    it('should configure custom error responses when isSinglePageApp is true', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify custom error responses exist for 403 and 404
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
  });
});
