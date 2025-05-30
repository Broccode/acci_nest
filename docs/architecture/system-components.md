# ACCI Nest - System Components

## Backend Services (NestJS Modules)

```typescript
// Core modules structure
- AuthModule
  - Services: AuthService, JwtStrategy
  - Controllers: AuthController
  - Guards: JwtAuthGuard, RolesGuard

- UserModule
  - Services: UserService
  - Controllers: UserController
  - Entities: User, UserProfile

- TenantModule
  - Services: TenantService, TenantResolver
  - Controllers: TenantController
  - Entities: Tenant, TenantSettings

- PluginModule
  - Services: PluginLoaderService, PluginRegistryService
  - Controllers: PluginController
  - Interfaces: IPlugin, IPluginConfig

- TenantControlPlaneModule
  - Services: TenantManagementService, TenantProvisioningService, TenantConfigurationService
  - Controllers: TenantControlPlaneController
  - Guards: TenantAdminGuard, ControlPlaneAccessGuard
  - Entities: TenantProvisioning, TenantOperationLog
```

### AuthModule

The AuthModule is responsible for:

- User authentication (login/logout)
- JWT token management
- Role-based access control
- Secure password processing

### UserModule

The UserModule manages:

- User profiles and authentication data
- Role-based access control (RBAC)
- Permission management
- Tenant-aware user operations
- Password security with bcrypt hashing
- User status management (active, inactive, locked, pending)

### TenantModule

The TenantModule implements:

- Tenant management
- Tenant-specific configurations
- Tenant isolation
- Cross-tenant operations

### PluginModule

The PluginModule enables:

- Dynamic loading of plugins
- Plugin lifecycle management
- Per-tenant plugin configuration
- Plugin hooks and event handling

### TenantControlPlaneModule

The TenantControlPlaneModule provides a centralized management system for tenants:

- Tenant provisioning and onboarding
- Tenant resource allocation and scaling
- Tenant configuration management
- Tenant monitoring and alerting
- Tenant lifecycle management (creation, suspension, deletion)
- Secure tenant administration with enhanced access controls
- Audit logging for tenant operations
- Tenant-specific performance monitoring

## Frontend Components

```typescript
// Core React components structure
- Layout
  - MainLayout.tsx
  - AuthLayout.tsx
  - DashboardLayout.tsx

- Auth
  - LoginForm.tsx
  - RegisterForm.tsx
  - ForgotPasswordForm.tsx

- Dashboard
  - DashboardHome.tsx
  - Analytics.tsx
  - UserManagement.tsx

- Tenant
  - TenantSelector.tsx
  - TenantSettings.tsx

- Plugins
  - PluginGallery.tsx
  - PluginCard.tsx
  - PluginConfiguration.tsx

- TenantControlPlane
  - TenantManagement.tsx
  - TenantProvisioning.tsx
  - TenantMonitoring.tsx
  - TenantResourceAllocation.tsx
  - TenantAuditLog.tsx
```

### Layout Components

The Layout components define:

- Basic page structure
- Navigation and menus
- Responsive design patterns
- Containers for different application areas

### Auth Components

The Auth components include:

- User login
- Registration forms
- Password management
- Multi-factor authentication

### Dashboard Components

The Dashboard components provide:

- Overviews and statistics
- User management interfaces
- Analytics and reporting
- System status displays

### Tenant Components

The Tenant components enable:

- Selection and switching between tenants
- Tenant-specific settings
- Tenant permission management
- Tenant-specific views

### Plugin Components

The Plugin components offer:

- Overview of available plugins
- Installation and configuration of plugins
- Plugin status management
- Plugin-specific user interfaces

### TenantControlPlane Components

The TenantControlPlane components provide:

- Administrative interface for tenant management
- Tenant creation and provisioning workflows
- Tenant resource monitoring and allocation
- Tenant configuration and customization
- Audit logs for tenant operations
- Performance monitoring dashboards for tenants

## Database Schema

```sql
-- Core database entities
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  preferred_language VARCHAR(5) NOT NULL DEFAULT 'en',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, tenant_id)
);

CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, tenant_id)
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  resource VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  conditions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(resource, action)
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, role_id)
);

CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  subscription_tier VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tenant_users (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE TABLE plugins (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tenant_plugins (
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  plugin_id UUID REFERENCES plugins(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY(tenant_id, plugin_id)
);

CREATE TABLE tenant_provisioning (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  resources JSONB NOT NULL DEFAULT '{}'::jsonb,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tenant_resource_limits (
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  max_limit INTEGER NOT NULL,
  alert_threshold INTEGER NOT NULL,
  current_usage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(tenant_id, resource_type)
);

CREATE TABLE tenant_operation_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  operation_type VARCHAR(50) NOT NULL,
  performed_by UUID REFERENCES users(id),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Entity-Relationship Model

```
users --< user_roles >-- roles
                          |
                          |
permissions --< role_permissions >+

tenants -+-> users
         |
         +-> roles
         |
         +-> tenant_provisioning
         |
         +-> tenant_resource_limits
         |
         +-> tenant_operation_logs
```

### Core Entities

#### Users

- Represents system users with authentication information
- Contains profile data (first name, last name, language preference)
- Stores password hashed with bcrypt
- Tracks user status (active, inactive, locked, pending)
- Tenant-aware with tenant isolation

#### Roles

- Defines user roles within the system
- Can be system-defined or tenant-specific
- Contains descriptive information
- Tenant-aware with tenant isolation
- Linked to users through many-to-many relationship

#### Permissions

- Represents granular access rights
- Based on resource and action combinations
- Can include conditional access rules
- Global across tenants but assigned through roles
- Provides building blocks for RBAC

#### Tenants

- Represents tenants/organizations
- Contains tenant-specific configurations
- Manages subscription information

#### Tenant Users

- Links users with tenants
- Defines tenant-specific roles
- Enables permission management per tenant

#### Plugins

- Manages available plugins
- Stores version information
- Contains global plugin configurations

#### Tenant Plugins

- Links plugins with tenants
- Enables tenant-specific plugin configuration
- Controls plugin activation per tenant

#### Tenant Provisioning

- Manages tenant provisioning lifecycle
- Tracks provisioning status for new tenants
- Stores resource allocation information
- Contains tenant-specific configuration settings

#### Tenant Resource Limits

- Defines resource limits per tenant
- Sets alert thresholds for resource monitoring
- Tracks current resource usage
- Supports performance isolation between tenants

#### Tenant Operation Logs

- Records audit trail for tenant operations
- Tracks administrative actions on tenants
- Maintains security logging for tenant management
- Supports compliance requirements
