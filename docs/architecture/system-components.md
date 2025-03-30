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
```

### AuthModule

The AuthModule is responsible for:

- User authentication (login/logout)
- JWT token management
- Role-based access control
- Secure password processing

### UserModule

The UserModule manages:

- User profiles
- User registration
- Permission management
- User-related settings

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

## Database Schema

```sql
-- Core database entities
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
```

### Entity-Relationship Model

```
users --< tenant_users >-- tenants
                             |
                             |
plugins --< tenant_plugins >+
```

### Core Entities

#### Users

- Represents system users
- Contains authentication information
- Stores roles and basic data

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
