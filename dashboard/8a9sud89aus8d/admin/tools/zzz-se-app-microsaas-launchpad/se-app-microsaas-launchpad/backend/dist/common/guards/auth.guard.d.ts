import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthBffService } from '../../auth-bff/auth-bff.service';
export declare class AuthGuard implements CanActivate {
    private readonly authBffService;
    constructor(authBffService: AuthBffService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
