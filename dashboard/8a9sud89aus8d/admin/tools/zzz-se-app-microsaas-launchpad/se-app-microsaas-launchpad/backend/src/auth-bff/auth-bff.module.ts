import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthBffService } from './auth-bff.service';
import { AuthBffController } from './auth-bff.controller';
import { AuthBffGuard } from './auth-bff.guard';
import { AdminUser } from '../database/entities/admin-user.entity';
import { AdminSession } from '../database/entities/admin-session.entity';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AdminUser, AdminSession]),
  ],
  controllers: [AuthBffController],
  providers: [AuthBffService, AuthBffGuard],
  exports: [AuthBffService, AuthBffGuard],
})
export class AuthBffModule {}
