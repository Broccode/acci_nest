"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tenant = exports.TenantStatus = void 0;
const core_1 = require("@mikro-orm/core");
const base_entity_1 = require("../../common/entities/base.entity");
var TenantStatus;
(function (TenantStatus) {
    TenantStatus["ACTIVE"] = "active";
    TenantStatus["SUSPENDED"] = "suspended";
    TenantStatus["TRIAL"] = "trial";
    TenantStatus["ARCHIVED"] = "archived";
})(TenantStatus || (exports.TenantStatus = TenantStatus = {}));
let Tenant = class Tenant extends base_entity_1.BaseEntity {
    constructor() {
        super(...arguments);
        this.status = TenantStatus.TRIAL;
        this.features = [];
        this.configuration = {};
    }
};
exports.Tenant = Tenant;
__decorate([
    (0, core_1.Property)(),
    (0, core_1.Unique)(),
    __metadata("design:type", String)
], Tenant.prototype, "name", void 0);
__decorate([
    (0, core_1.Property)(),
    (0, core_1.Unique)(),
    __metadata("design:type", String)
], Tenant.prototype, "domain", void 0);
__decorate([
    (0, core_1.Enum)(() => TenantStatus),
    __metadata("design:type", String)
], Tenant.prototype, "status", void 0);
__decorate([
    (0, core_1.Property)({ nullable: true }),
    __metadata("design:type", String)
], Tenant.prototype, "plan", void 0);
__decorate([
    (0, core_1.Property)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], Tenant.prototype, "features", void 0);
__decorate([
    (0, core_1.Property)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Tenant.prototype, "configuration", void 0);
exports.Tenant = Tenant = __decorate([
    (0, core_1.Entity)({ tableName: 'tenants' })
], Tenant);
//# sourceMappingURL=tenant.entity.js.map