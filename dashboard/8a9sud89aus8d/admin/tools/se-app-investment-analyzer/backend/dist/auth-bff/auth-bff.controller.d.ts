import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthBffService } from './auth-bff.service';
export declare class AuthBffController {
    private readonly authBffService;
    private readonly configService;
    private readonly frontendUrl;
    private readonly isProduction;
    constructor(authBffService: AuthBffService, configService: ConfigService);
    private setAccessTokenCookie;
    private clearAccessTokenCookie;
    private extractToken;
    login(res: Response): Promise<void>;
    callback(code: string, req: Request, res: Response): Promise<{
        token_type: string;
        user: import("./auth-bff.service").AuthUser;
    }>;
    me(req: Request): Promise<{
        user: import("./auth-bff.service").AuthUser;
    }>;
    status(req: Request): Promise<{
        authenticated: boolean;
        user?: undefined;
    } | {
        authenticated: boolean;
        user: import("./auth-bff.service").AuthUser;
    }>;
    refresh(userId: string, res: Response): Promise<{
        token_type: string;
        user: import("./auth-bff.service").AuthUser;
    }>;
    logout(userId: string, res: Response): Promise<{
        success: boolean;
        message: string;
    }>;
}
