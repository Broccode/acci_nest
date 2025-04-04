# LDAP/Active Directory Authentication

This documentation describes the integration and configuration of LDAP/Active Directory authentication for the ACCI Nest Framework.

## Overview

The LDAP/AD integration enables authentication of users against an existing enterprise directory (LDAP or Active Directory). Users can log in with their existing corporate credentials without having to create separate accounts.

## Features

- Authentication against LDAP/Active Directory servers
- Automatic user provisioning upon successful LDAP authentication
- Synchronization of user information from the LDAP directory
- Support for secure connections (TLS/SSL)
- Integration with the existing JWT token system
- Compatibility with Multi-Factor Authentication (MFA)

## Configuration

### Environment Variables

The LDAP configuration is done via environment variables:

```
# LDAP Server Configuration
LDAP_URL=ldap://ldap.example.com:389
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_CREDENTIALS=admin_password
LDAP_SEARCH_BASE=ou=users,dc=example,dc=com
LDAP_SEARCH_FILTER=(mail={{username}})
LDAP_USE_TLS=true
LDAP_REJECT_UNAUTHORIZED=true

# Default Tenant for LDAP Users
LDAP_DEFAULT_TENANT_ID=default
LDAP_DEFAULT_TENANT_NAME=ldap
LDAP_DEFAULT_TENANT_DOMAIN=ldap.domain
```

### Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `LDAP_URL` | URL of the LDAP server | `ldap://ldap.example.com:389` |
| `LDAP_BIND_DN` | Bind DN for the LDAP server | `cn=admin,dc=example,dc=com` |
| `LDAP_BIND_CREDENTIALS` | Password for the Bind DN | `admin_password` |
| `LDAP_SEARCH_BASE` | Base DN for user search | `ou=users,dc=example,dc=com` |
| `LDAP_SEARCH_FILTER` | Filter for user search | `(mail={{username}})` |
| `LDAP_USE_TLS` | Enable TLS for LDAP connection | `false` |
| `LDAP_REJECT_UNAUTHORIZED` | Reject unauthorized TLS certificates | `true` |
| `LDAP_DEFAULT_TENANT_ID` | Default tenant ID for LDAP users | `default` |
| `LDAP_DEFAULT_TENANT_NAME` | Default tenant name for LDAP users | `ldap` |
| `LDAP_DEFAULT_TENANT_DOMAIN` | Default tenant domain for LDAP users | `ldap.domain` |

## Usage

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/ldap/login` | POST | LDAP user login |

### Example Request

```json
// POST /auth/ldap/login
{
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "mfaCode": "123456"  // Optional, if MFA is enabled
}
```

### Example Response

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "tenantId": "default",
    "mfaEnabled": false
  }
}
```

## Security Notes

- Always use LDAPS (LDAP over SSL) or LDAP with StartTLS in production environments
- Protect LDAP credentials in your configuration
- Implement appropriate rate limits for LDAP authentication requests
- Monitor failed login attempts
- Consider enabling Multi-Factor Authentication for all users

## Troubleshooting

### Common Issues

1. **Connection Problems**: Ensure the LDAP server is reachable and that firewalls or network rules allow access.

2. **Authentication Errors**: Verify the BIND-DN and BIND password are correct.

3. **User Not Found**: Check the search filter and search base. Make sure the user exists in the specified LDAP directory.

4. **TLS Problems**: For TLS connection issues, you can set `LDAP_REJECT_UNAUTHORIZED=false` (for testing only, not for production!).
