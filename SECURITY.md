# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.6.x   | :white_check_mark: |
| 0.5.x   | :white_check_mark: |
| 0.4.x   | :x:                |
| < 0.4   | :x:                |

## Reporting a Vulnerability

We take the security of fanion seriously. If you believe you have found a security vulnerability, please report it to us as described below.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to [contact@mgvdev.io](mailto:contact@mgvdev.io).

Please include the following information in your report:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

## Response Timeline

We will acknowledge receipt of your vulnerability report within 2 business days and will send you regular updates about our progress. If you have not received a response to your email within 2 business days, please follow up to ensure we have received your original message.

We will work with you to understand the scope of the vulnerability and develop a fix. Once we have developed a fix, we will:

1. Test the fix to ensure it resolves the issue without introducing new problems
2. Prepare a security advisory
3. Coordinate the release of the fix
4. Publish the security advisory

## Disclosure Policy

We follow a coordinated disclosure policy. We ask that you:

- Give us reasonable time to investigate and mitigate an issue you report before making any information public
- Make a good faith effort to avoid privacy violations, destruction of data, and interruption or degradation of our services
- Do not access or modify data that does not belong to you
- Contact us before sharing details of the vulnerability with others

## Security Best Practices

When using fanion in production, we recommend:

1. **Keep Dependencies Updated**: Regularly update fanion and all dependencies to the latest versions
2. **Validate Input**: Always validate and sanitize user input before using it with feature flags
3. **Use Secure Configurations**: Ensure your database connections and other configurations follow security best practices
4. **Monitor for Vulnerabilities**: Use tools like `npm audit` to regularly check for known vulnerabilities
5. **Principle of Least Privilege**: Only grant the minimum permissions necessary for your application
6. **Environment Variables**: Never hardcode sensitive information; use environment variables instead

## Security Updates

Security updates will be released as patch versions and will be announced through:

- GitHub Security Advisories
- Release notes
- Email notifications to maintainers

## Questions

If you have questions about this security policy, please contact us at [contact@mgvdev.io](mailto:contact@mgvdev.io).

## Acknowledgments

We appreciate the security research community's efforts to responsibly disclose vulnerabilities. Contributors who responsibly report security issues will be acknowledged in our security advisories (unless they prefer to remain anonymous).