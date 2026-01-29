import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminUsersModule } from '../admin-users/admin-users.module';
import { AdminSessionsModule } from '../admin-sessions/admin-sessions.module';
import { ProjectsModule } from '../projects/projects.module';
import { AuthGuard } from '../common/guards';

@Module({
  imports: [AdminUsersModule, AdminSessionsModule, ProjectsModule],
  controllers: [AdminController],
  providers: [AdminService, AuthGuard],
  exports: [AuthGuard],
})
export class AdminModule {}
