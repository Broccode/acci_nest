import { BaseEntity } from '../../common/entities/base.entity';
export declare enum TenantStatus {
    ACTIVE = "active",
    SUSPENDED = "suspended",
    TRIAL = "trial",
    ARCHIVED = "archived"
}
export declare class Tenant extends BaseEntity {
    name: string;
    domain: string;
    status: TenantStatus;
    plan?: string;
    features?: Record<string, any>[];
    configuration?: {
        theme?: Record<string, any>;
        security?: Record<string, any>;
        integrations?: Record<string, any>[];
    };
}
