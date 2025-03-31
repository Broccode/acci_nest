"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nestjs_1 = require("@mikro-orm/nestjs");
const configuration_1 = require("./config/configuration");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
            }),
            nestjs_1.MikroOrmModule.forRootAsync({
                useFactory: (configService) => ({
                    driver: require('@mikro-orm/postgresql').PostgreSqlDriver,
                    host: configService.get('database.host'),
                    port: configService.get('database.port'),
                    user: configService.get('database.username'),
                    password: configService.get('database.password'),
                    dbName: configService.get('database.name'),
                    entities: ['dist/**/*.entity.js'],
                    entitiesTs: ['src/**/*.entity.ts'],
                    debug: configService.get('environment') === 'development',
                    autoLoadEntities: true,
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map