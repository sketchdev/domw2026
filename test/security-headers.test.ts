import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { StaticSiteConstruct } from '../src/static-site-construct';

/**
 * Unit tests for Security Headers Policy configuration.
 * 
 * These tests verify that the CloudFront Response Headers Policy is created with:
 * - X-Content-Type-Options header (nosniff)
 * - X-Frame-Options header (DENY)
 * - Strict-Transport-Security header (max-age >= 31536000, includeSubDomains)
 * - Content-Security-Policy header
 */
describe('Security Headers Policy', () => {
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

  describe('X-Content-Type-Options Header', () => {
    /**
     * THE Security_Headers_Policy SHALL include the X-Content-Type-Options header
     * with value "nosniff"
     */
    it('should include X-Content-Type-Options header with override enabled', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            ContentTypeOptions: {
              Override: true,
            },
          },
        },
      });
    });

    /**
     * Verifies X-Content-Type-Options is present in static HTML mode
     */
    it('should include X-Content-Type-Options header in static HTML mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            ContentTypeOptions: {
              Override: true,
            },
          },
        },
      });
    });
  });

  describe('X-Frame-Options Header', () => {
    /**
     * THE Security_Headers_Policy SHALL include the X-Frame-Options header
     * with value "DENY"
     */
    it('should include X-Frame-Options header set to DENY', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            FrameOptions: {
              FrameOption: 'DENY',
              Override: true,
            },
          },
        },
      });
    });

    /**
     * Verifies X-Frame-Options is present in static HTML mode
     */
    it('should include X-Frame-Options header in static HTML mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            FrameOptions: {
              FrameOption: 'DENY',
              Override: true,
            },
          },
        },
      });
    });
  });

  describe('Strict-Transport-Security Header', () => {
    /**
     * THE Security_Headers_Policy SHALL include the Strict-Transport-Security header
     * with a max-age of at least 31536000 seconds and the includeSubDomains directive
     */
    it('should include Strict-Transport-Security header with max-age of at least 31536000 seconds', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      // Verify HSTS header with expected max-age (31536000 = 1 year in seconds)
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            StrictTransportSecurity: {
              AccessControlMaxAgeSec: 31536000,
              IncludeSubdomains: true,
              Override: true,
            },
          },
        },
      });
    });

    /**
     * Verifies HSTS header includes includeSubdomains directive
     */
    it('should include includeSubdomains directive in HSTS header', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            StrictTransportSecurity: {
              IncludeSubdomains: true,
            },
          },
        },
      });
    });

    /**
     * Verifies HSTS header is present in static HTML mode
     */
    it('should include Strict-Transport-Security header in static HTML mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);
      // Verify HSTS header with expected max-age (31536000 = 1 year in seconds)
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            StrictTransportSecurity: {
              AccessControlMaxAgeSec: 31536000,
              IncludeSubdomains: true,
              Override: true,
            },
          },
        },
      });
    });
  });

  describe('Content-Security-Policy Header', () => {
    /**
     * THE Security_Headers_Policy SHALL include the Content-Security-Policy header
     * with a directive restricting resource loading to same-origin by default
     */
    it('should include Content-Security-Policy header with default-src self directive', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            ContentSecurityPolicy: {
              ContentSecurityPolicy: Match.stringLikeRegexp("default-src 'self'"),
              Override: true,
            },
          },
        },
      });
    });

    /**
     * Verifies CSP header includes script-src directive
     */
    it('should include script-src directive in Content-Security-Policy header', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            ContentSecurityPolicy: {
              ContentSecurityPolicy: Match.stringLikeRegexp("script-src 'self'"),
            },
          },
        },
      });
    });

    /**
     * Verifies CSP header includes frame-ancestors none directive (complements X-Frame-Options)
     */
    it('should include frame-ancestors none directive in Content-Security-Policy header', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            ContentSecurityPolicy: {
              ContentSecurityPolicy: Match.stringLikeRegexp("frame-ancestors 'none'"),
            },
          },
        },
      });
    });

    /**
     * Verifies CSP header is present in static HTML mode
     */
    it('should include Content-Security-Policy header in static HTML mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            ContentSecurityPolicy: {
              ContentSecurityPolicy: Match.stringLikeRegexp("default-src 'self'"),
              Override: true,
            },
          },
        },
      });
    });
  });

  describe('Response Headers Policy Resource', () => {
    /**
     * WHEN the Static_Site_Construct is instantiated, THE CloudFront_Distribution
     * SHALL have a Security_Headers_Policy attached
     */
    it('should create exactly one response headers policy', () => {
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
     * Verifies response headers policy is created regardless of deployment mode
     */
    it('should create response headers policy in static HTML mode', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::CloudFront::ResponseHeadersPolicy', 1);
    });

    /**
     * Verifies all security headers are configured together
     */
    it('should configure all security headers in a single policy', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            ContentTypeOptions: {
              Override: true,
            },
            FrameOptions: {
              FrameOption: 'DENY',
              Override: true,
            },
            StrictTransportSecurity: {
              AccessControlMaxAgeSec: 31536000,
              IncludeSubdomains: true,
              Override: true,
            },
            ContentSecurityPolicy: {
              ContentSecurityPolicy: Match.stringLikeRegexp("default-src 'self'"),
              Override: true,
            },
          },
        },
      });
    });
  });
});
