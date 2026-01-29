import { Module, Global } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { AuthBffModule } from '../auth-bff/auth-bff.module';

@Global()
@Module({
  imports: [AuthBffModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
