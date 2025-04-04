# ACCI Nest - Technical Decisions

## Framework Selection

| Component | Technology | Rationale |
|------------|-------------|------------|
| Backend    | NestJS      | Modular structure, TypeScript support, Dependency Injection |
| Frontend   | React       | Component-based, large community, flexibility |
| ORM        | MikroORM    | TypeScript integration, Repository pattern, better type safety |
| API Docs   | Swagger     | Automatic documentation, testability |
| Testing    | Jest        | Comprehensive, easy mock creation |

### Framework Decision Rationale

#### NestJS

NestJS was chosen as the backend framework for the following reasons:

- **Modular Structure**: Supports the development of a modular architecture
- **TypeScript Native**: Provides strong typing and better IDE support
- **Dependency Injection**: Simplifies testability and modularity
- **Express Compatibility**: Enables use of the Express ecosystem
- **Decorator API**: Facilitates implementation of middleware and guards
- **Integrations**: Offers ready-made integrations for MikroORM, GraphQL, etc.

#### React

React was selected for the frontend due to the following aspects:

- **Component-based Approach**: Promotes reusability
- **Virtual DOM**: Provides high performance for complex UIs
- **Large Community**: Numerous libraries and resources available
- **TypeScript Support**: Full TypeScript integration possible
- **Flexibility**: Can be combined with various state management solutions
- **React Hooks**: Modern, functional development with improved code structure

## Authentication Approach

```typescript
// auth.module.ts
@Module({
  imports: [
    JwtModule.register({
      secret: configService.get('JWT_SECRET'),
      signOptions: { expiresIn: '1h' },
    }),
    PassportModule,
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

### JWT-based Authentication

The application uses a JWT-based authentication approach:

- **Token-based**: No sessions on the server, scalable
- **Short-lived Tokens**: 1-hour lifetime for security
- **Refresh Tokens**: For seamless user experience
- **JWT Claims**: Contains user ID, roles, and tenant information
- **Passport Integration**: Uses Passport.js for authentication strategies

### Role-based Authorization

```typescript
// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

Authorization is implemented through:

- **RBAC System**: Role-based access control
- **Decorator-based**: Easy application to controllers and methods
- **Granular Permissions**: Control at resource and operation level
- **Tenant Context**: Considers user role in tenant context

## Multi-Tenancy Implementation

```typescript
// tenant.middleware.ts
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private tenantService: TenantService) {}

  async use(req: Request, res: Response, next: Function) {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }
    
    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    
    req['tenant'] = tenant;
    TenantContext.setCurrentTenant(tenant);
    next();
  }
}
```

### Multi-Tenancy Strategy

The application implements a discriminator-based multi-tenancy approach:

- **Tenant ID as Discriminator**: Each record is associated with a tenant
- **Shared Database**: All tenants share the database instance
- **Tenant Isolation**: Through automatic filtering at database level
- **Tenant Context**: ThreadLocal-like approach for tenant identification
- **API Layer Filter**: Automatic filtering of all database accesses by tenant ID

### Tenant Control Plane

```typescript
// tenant-control-plane.module.ts
@Module({
  imports: [
    TenantModule,
    AuthModule,
    ConfigModule,
    MikroOrmModule.forFeature([
      TenantProvisioning,
      TenantResourceLimits,
      TenantOperationLog,
    ]),
  ],
  controllers: [TenantControlPlaneController],
  providers: [
    TenantManagementService,
    TenantProvisioningService,
    TenantConfigurationService,
    TenantMonitoringService,
    {
      provide: APP_GUARD,
      useClass: ControlPlaneAccessGuard,
    },
  ],
  exports: [
    TenantManagementService,
    TenantProvisioningService,
  ],
})
export class TenantControlPlaneModule {}
```

The Control Plane provides centralized tenant management:

- **Tenant Onboarding**: Automated provisioning of new tenants
- **Tenant Lifecycle**: Management of tenant creation, suspension, and deletion
- **Resource Allocation**: Assignment of infrastructure resources per tenant
- **Configuration Management**: Centralized management of tenant configurations
- **Tenant Monitoring**: Health and performance monitoring of tenant resources
- **Admin Interface**: Administrative dashboard for tenant management
- **Audit Logging**: Comprehensive audit trails for all tenant operations
- **Security Controls**: Strong access controls for tenant management functions

### Performance Isolation

```typescript
// tenant-resource-limiter.service.ts
@Injectable()
export class TenantResourceLimiterService {
  constructor(
    @InjectRepository(TenantResourceLimits)
    private resourceLimitsRepository: Repository<TenantResourceLimits>,
    private monitoringService: MonitoringService,
  ) {}
  
  async enforceResourceLimits(
    tenantId: string,
    resourceType: ResourceType,
    requestedAmount: number,
  ): Promise<boolean> {
    const limits = await this.resourceLimitsRepository.findOne({
      where: { tenantId, resourceType },
    });
    
    if (!limits) {
      return true; // No specific limits defined
    }
    
    const currentUsage = await this.monitoringService.getCurrentUsage(
      tenantId,
      resourceType,
    );
    
    if (currentUsage + requestedAmount > limits.maxLimit) {
      // Log and alert on resource limit reached
      await this.monitoringService.recordLimitExceeded(
        tenantId,
        resourceType,
        currentUsage,
        requestedAmount,
        limits.maxLimit,
      );
      
      return false; // Limit exceeded
    }
    
    // Update current usage metrics
    await this.resourceLimitsRepository.update(
      { tenantId, resourceType },
      { currentUsage: currentUsage + requestedAmount },
    );
    
    return true;
  }
}
```

Performance isolation is implemented through:

- **Resource Quotas**: Enforced limits on resource consumption per tenant
- **Rate Limiting**: Tenant-specific API request limits
- **Connection Pool Management**: Dedicated or fairly shared database connections
- **Query Limits**: Maximum complexity and execution time for database queries
- **Background Job Throttling**: Fair allocation of background processing tasks
- **Resource Monitoring**: Real-time tracking of tenant resource consumption
- **Adaptive Throttling**: Dynamic adjustment of limits based on system load
- **Fair Resource Scheduling**: Balanced allocation during resource contention

### Advantages of the Chosen Strategy

- **Cost Efficiency**: No separate database instances needed per tenant
- **Simpler Deployment**: Less infrastructure complexity
- **Efficient Resource Usage**: Better hardware utilization
- **Easier Updates**: Central upgrades for all tenants
- **Flexibility**: Possibility for dedicated resources for premium tenants
- **Scalability**: Ability to handle growing number of tenants
- **Isolation**: Strong data isolation without infrastructure separation
- **Performance Protection**: Prevention of "noisy neighbor" problems

## Security Measures (OWASP/SOC2)

### Protection Against Common Vulnerabilities

| Threat | Protection Mechanism | Implementation Details |
|-----------|-------------------|-------------------------|
| Injection | Prepared Statements, ORM | MikroORM with parameterization |
| XSS | Content Security Policy, Output Encoding | Helmet.js, React escaping |
| CSRF | CSRF Tokens, SameSite Cookies | CSRF middleware |
| Broken Authentication | Secure Password Hashing, MFA | Argon2, TOTP |
| Sensitive Data Exposure | Encryption, HTTPS | TLS 1.3, AES-256 |
| Broken Access Control | RBAC, API Guards | RolesGuard, ResourceGuard |
| Security Misconfig | Security Headers, Secure Defaults | Helmet.js |
| SSRF | URL Validation, Whitelisting | URL filtering |
| Insecure Deserialization | Input Validation, Schema Checking | class-validator, class-transformer |
| Insufficient Logging | Structured Logging, Audit Trails | Winston, LoggingInterceptor |

### SOC2 Compliance Features

- **Audit Logging**: Logging of security-relevant events
- **User Activities**: Tracking of logins and critical actions
- **Data Security**: Encryption of sensitive data
- **Access Controls**: Detailed permission structures
- **Change Management**: Versioning and deployment controls
- **Incident Response**: Mechanisms for detection and response to incidents
