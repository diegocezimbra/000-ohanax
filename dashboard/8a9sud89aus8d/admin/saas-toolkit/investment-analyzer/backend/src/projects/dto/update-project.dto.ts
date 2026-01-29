import { IsString, IsOptional, IsBoolean, ValidateNested, IsArray, Matches } from 'class-validator';
import { Type } from 'class-transformer';

class OAuthSettingsDto {
  @IsBoolean()
  @IsOptional()
  google?: boolean;

  @IsBoolean()
  @IsOptional()
  github?: boolean;
}

class ThemeSettingsDto {
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'primaryColor must be a valid hex color (e.g., #7c3aed)' })
  primaryColor?: string;

  @IsString()
  @IsOptional()
  backgroundColor?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;
}

class EmailTemplateDto {
  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  body?: string;
}

class EmailTemplatesSettingsDto {
  @ValidateNested()
  @Type(() => EmailTemplateDto)
  @IsOptional()
  verifyEmail?: EmailTemplateDto;

  @ValidateNested()
  @Type(() => EmailTemplateDto)
  @IsOptional()
  resetPassword?: EmailTemplateDto;
}

class ProjectSettingsDto {
  @IsBoolean()
  @IsOptional()
  allowSignup?: boolean;

  @IsBoolean()
  @IsOptional()
  allowPasswordReset?: boolean;

  @IsBoolean()
  @IsOptional()
  requireEmailVerification?: boolean;

  @ValidateNested()
  @Type(() => OAuthSettingsDto)
  @IsOptional()
  oauth?: OAuthSettingsDto;

  @ValidateNested()
  @Type(() => ThemeSettingsDto)
  @IsOptional()
  theme?: ThemeSettingsDto;

  @ValidateNested()
  @Type(() => EmailTemplatesSettingsDto)
  @IsOptional()
  emailTemplates?: EmailTemplatesSettingsDto;
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedDomains?: string[];

  @ValidateNested()
  @Type(() => ProjectSettingsDto)
  @IsOptional()
  settings?: ProjectSettingsDto;
}
