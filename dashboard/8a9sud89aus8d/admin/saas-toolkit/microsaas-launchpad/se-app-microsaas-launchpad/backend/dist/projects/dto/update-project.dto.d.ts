declare class OAuthSettingsDto {
    google?: boolean;
    github?: boolean;
}
declare class ThemeSettingsDto {
    primaryColor?: string;
    backgroundColor?: string;
    logoUrl?: string;
}
declare class EmailTemplateDto {
    subject?: string;
    body?: string;
}
declare class EmailTemplatesSettingsDto {
    verifyEmail?: EmailTemplateDto;
    resetPassword?: EmailTemplateDto;
}
declare class ProjectSettingsDto {
    allowSignup?: boolean;
    allowPasswordReset?: boolean;
    requireEmailVerification?: boolean;
    oauth?: OAuthSettingsDto;
    theme?: ThemeSettingsDto;
    emailTemplates?: EmailTemplatesSettingsDto;
}
export declare class UpdateProjectDto {
    name?: string;
    description?: string;
    allowedDomains?: string[];
    settings?: ProjectSettingsDto;
}
export {};
