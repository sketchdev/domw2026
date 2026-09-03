/**
 * Input validation utilities for the Static Site Construct.
 *
 * @packageDocumentation
 */

/**
 * Validates that a domain name is a valid FQDN according to RFC 1123.
 *
 * Validation rules:
 * - Length must be between 1 and 253 characters (inclusive)
 * - Must match RFC 1123 FQDN format:
 *   - Labels separated by dots
 *   - Each label is 1-63 characters
 *   - Labels contain only alphanumeric characters and hyphens
 *   - Labels do not start or end with a hyphen
 *
 * @param domainName - The domain name to validate
 * @throws Error if the domain name is empty, too long, or invalid format
 *
 * @example
 * ```typescript
 * validateDomainName('www.example.com'); // Valid - no error
 * validateDomainName(''); // Throws: "domainName is required and cannot be empty"
 * validateDomainName('invalid..domain'); // Throws: "Invalid domain name format: invalid..domain. Must be a valid FQDN."
 * ```
 */
export function validateDomainName(domainName: string): void {
  // Check for empty or missing domain name
  if (!domainName || domainName.length === 0) {
    throw new Error('domainName is required and cannot be empty');
  }

  // Check length constraints (1-253 characters)
  if (domainName.length > 253) {
    throw new Error(
      `domainName exceeds maximum length of 253 characters: ${domainName.length}`
    );
  }

  // Validate FQDN format using RFC 1123 pattern
  // - Each label is 1-63 characters
  // - Labels contain only alphanumeric characters and hyphens
  // - Labels do not start or end with a hyphen
  // - Labels are separated by dots
  const fqdnPattern = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63}(?<!-))*$/;

  if (!fqdnPattern.test(domainName)) {
    throw new Error(
      `Invalid domain name format: ${domainName}. Must be a valid FQDN.`
    );
  }
}
