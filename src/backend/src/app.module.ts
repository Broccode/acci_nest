import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    
    // Database - MikroORM
    MikroOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
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
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
