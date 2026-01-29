"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProjectDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class OAuthSettingsDto {
}
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], OAuthSettingsDto.prototype, "google", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], OAuthSettingsDto.prototype, "github", void 0);
class ThemeSettingsDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^#[0-9A-Fa-f]{6}$/, { message: 'primaryColor must be a valid hex color (e.g., #7c3aed)' }),
    __metadata("design:type", String)
], ThemeSettingsDto.prototype, "primaryColor", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ThemeSettingsDto.prototype, "backgroundColor", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ThemeSettingsDto.prototype, "logoUrl", void 0);
class EmailTemplateDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EmailTemplateDto.prototype, "subject", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EmailTemplateDto.prototype, "body", void 0);
class EmailTemplatesSettingsDto {
}
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => EmailTemplateDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", EmailTemplateDto)
], EmailTemplatesSettingsDto.prototype, "verifyEmail", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => EmailTemplateDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", EmailTemplateDto)
], EmailTemplatesSettingsDto.prototype, "resetPassword", void 0);
class ProjectSettingsDto {
}
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], ProjectSettingsDto.prototype, "allowSignup", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], ProjectSettingsDto.prototype, "allowPasswordReset", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], ProjectSettingsDto.prototype, "requireEmailVerification", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => OAuthSettingsDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", OAuthSettingsDto)
], ProjectSettingsDto.prototype, "oauth", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ThemeSettingsDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", ThemeSettingsDto)
], ProjectSettingsDto.prototype, "theme", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => EmailTemplatesSettingsDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", EmailTemplatesSettingsDto)
], ProjectSettingsDto.prototype, "emailTemplates", void 0);
class UpdateProjectDto {
}
exports.UpdateProjectDto = UpdateProjectDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProjectDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProjectDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdateProjectDto.prototype, "allowedDomains", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ProjectSettingsDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", ProjectSettingsDto)
], UpdateProjectDto.prototype, "settings", void 0);
//# sourceMappingURL=update-project.dto.js.map