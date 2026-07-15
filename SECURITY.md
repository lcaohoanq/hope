# Security Policy

## Reporting a Vulnerability

Please do not open a public issue for security vulnerabilities.

If you discover a vulnerability, email the maintainer or use GitHub's private vulnerability reporting if it is enabled for this repository. Include:

- A short description of the issue.
- Steps to reproduce.
- Impact and affected versions, if known.
- Any suggested fix or mitigation.

## Secret Handling

Hope requires third-party credentials for Clerk, Postgres, Cloudinary, Resend, and optional automation. Keep all secrets in local environment files, deployment provider secrets, or GitHub Actions secrets.

Never commit:

- `.env`, `.env.local`, or other filled environment files.
- Database URLs.
- Clerk secret keys.
- Cloudinary API secrets.
- Resend API keys.
- Personal access tokens.
- Private user data, migration manifests, or uploaded media.

Before publishing a branch, run a secret scan with a tool such as `gitleaks` or `trufflehog`.
