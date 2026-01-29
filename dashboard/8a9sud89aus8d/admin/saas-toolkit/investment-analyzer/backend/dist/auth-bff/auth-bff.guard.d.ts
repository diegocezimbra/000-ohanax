import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthBffService, AuthUser } from './auth-bff.service';
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
export declare class AuthBffGuard implements CanActivate {
    private readonly authBffService;
    constructor(authBffService: AuthBffService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
