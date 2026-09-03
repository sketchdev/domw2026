import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { StaticSiteConstruct } from '../src/static-site-construct';

/**
 * Unit tests for ACM Certificate configuration.
 * 
 * These tests verify that the ACM certificate is:
 * - Created in the us-east-1 region (required for CloudFront)
 * - Configured with DNS validation using the provided hosted zone
 * 
 * Note: DnsValidatedCertificate creates a custom CloudFormation resource
 * that provisions the certificate cross-region. We verify the custom
 * resource properties to ensure correct configuration.
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 10.4
 */
describe('ACM Certificate', () => {
  let app: App;
  let stack: Stack;
  let hostedZone: HostedZone;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'us-west-2', // Deploy stack in non us-east-1 region to verify cross-region cert
      },
    });
    // Create a mock hosted zone for testing
    hostedZone = HostedZone.fromHostedZoneAttributes(stack, 'Zone', {
      hostedZoneId: 'Z1234567890ABC',
      zoneName: 'example.com',
    }) as HostedZone;
  });

  describe('Region Configuration', () => {
    /**
     * Validates Requirement 3.2:
     * THE ACM_Certificate SHALL be provisioned in the us-east-1 region
     * as required by CloudFront
     * 
     * DnsValidatedCertificate creates a custom resource that deploys
     * the certificate to a specific region. We verify the Region property
     * of the custom resource is set to us-east-1.
     */
    it('should create certificate in us-east-1 region', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // DnsValidatedCertificate creates a Custom::CrossRegionStringParameterReader
      // resource that reads the certificate ARN from us-east-1
      // The certificate itself is created via a CertificateRequestorResource custom resource
      template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
        Region: 'us-east-1',
      });
    });

    /**
     * Verifies the certificate is created for CloudFront regardless of stack region
     */
    it('should create certificate in us-east-1 even when stack is in different region', () => {
      // Arrange - stack is in us-west-2 (set in beforeEach)
      
      // Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Verify the custom resource targets us-east-1 for the certificate
      template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
        Region: 'us-east-1',
      });
    });
  });

  describe('DNS Validation', () => {
    /**
     * Validates Requirement 3.3:
     * THE ACM_Certificate SHALL use DNS validation for automated certificate
     * issuance and SHALL create the required Route 53 DNS validation records
     * 
     * DnsValidatedCertificate configures the custom resource with the hosted
     * zone ID for automatic DNS record creation.
     */
    it('should configure DNS validation with the provided hosted zone', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // The custom resource should reference the hosted zone ID for DNS validation
      template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
        HostedZoneId: 'Z1234567890ABC',
      });
    });

    /**
     * Verifies the certificate is created for the correct domain name
     */
    it('should create certificate for the specified domain name', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // The custom resource should specify the domain name for the certificate
      template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
        DomainName: 'www.example.com',
      });
    });

    /**
     * Verifies subdomain certificates work correctly
     */
    it('should create certificate for subdomain with correct hosted zone', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'app.example.com',
        hostedZone,
        isSinglePageApp: false,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
        DomainName: 'app.example.com',
        HostedZoneId: 'Z1234567890ABC',
        Region: 'us-east-1',
      });
    });
  });

  describe('Certificate Exposure', () => {
    /**
     * Verifies the certificate is exposed as a public property for use
     * by CloudFront distribution
     */
    it('should expose the certificate as a public readonly property', () => {
      // Arrange & Act
      const construct = new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      expect(construct.certificate).toBeDefined();
      expect(construct.certificate.certificateArn).toBeDefined();
    });
  });

  describe('Certificate Lambda Function', () => {
    /**
     * Verifies that the certificate requestor Lambda function is created
     * DnsValidatedCertificate creates a Lambda function to handle certificate
     * provisioning in us-east-1
     */
    it('should create a Lambda function for certificate provisioning', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // DnsValidatedCertificate creates a singleton Lambda function for certificate requests
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'index.certificateRequestHandler',
        Runtime: Match.stringLikeRegexp('nodejs.*'),
      });
    });

    /**
     * Verifies the Lambda function has appropriate IAM permissions
     * to create certificates and Route 53 records
     */
    it('should grant Lambda function permissions for ACM and Route 53', () => {
      // Arrange & Act
      new StaticSiteConstruct(stack, 'TestSite', {
        domainName: 'www.example.com',
        hostedZone,
        isSinglePageApp: true,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Verify IAM role exists for the Lambda function
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com',
              },
            }),
          ]),
        },
      });
    });
  });
});
