import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminUser, Project, AdminSession, ApiKey } from './entities';
import { PrefixNamingStrategy } from './naming-strategy';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        extra: {
          // Force IPv4 to avoid IPv6 connection issues with Supabase
          family: 4,
        },
        entities: [AdminUser, Project, AdminSession, ApiKey],
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: true, // Always run migrations - TypeORM tracks executed migrations in DB
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
        namingStrategy: new PrefixNamingStrategy(),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
