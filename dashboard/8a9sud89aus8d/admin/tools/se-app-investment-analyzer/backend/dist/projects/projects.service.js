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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = require("crypto");
const entities_1 = require("../database/entities");
let ProjectsService = class ProjectsService {
    constructor(projectRepository, apiKeyRepository) {
        this.projectRepository = projectRepository;
        this.apiKeyRepository = apiKeyRepository;
    }
    async findAll(options) {
        const { page, limit, ownerId } = options;
        const where = {};
        if (ownerId) {
            where.ownerId = ownerId;
        }
        const [data, total] = await this.projectRepository.findAndCount({
            where,
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
            relations: ['apiKeys'],
        });
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findById(id) {
        return this.projectRepository.findOne({
            where: { id },
            relations: ['apiKeys'],
        });
    }
    async findByApiKey(apiKey) {
        const keyHash = this.hashApiKey(apiKey);
        const key = await this.apiKeyRepository.findOne({
            where: { keyHash, active: true },
            relations: ['project'],
        });
        if (key) {
            await this.apiKeyRepository.update(key.id, { lastUsedAt: new Date() });
            return key.project;
        }
        return null;
    }
    async create(ownerId, data) {
        const project = this.projectRepository.create({
            name: data.name,
            description: data.description,
            ownerId,
            allowedDomains: data.allowedDomains || [],
            settings: {
                allowSignup: true,
                allowPasswordReset: true,
                requireEmailVerification: true,
                oauth: {
                    google: false,
                    github: false,
                },
            },
        });
        return this.projectRepository.save(project);
    }
    async update(id, data) {
        const project = await this.projectRepository.findOne({ where: { id } });
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        if (data.settings) {
            project.settings = { ...project.settings, ...data.settings };
            delete data.settings;
        }
        Object.assign(project, data);
        return this.projectRepository.save(project);
    }
    async remove(id) {
        const result = await this.projectRepository.delete(id);
        if (result.affected === 0) {
            throw new common_1.NotFoundException('Project not found');
        }
    }
    async createApiKey(projectId, name) {
        const project = await this.projectRepository.findOne({ where: { id: projectId } });
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        const plainKey = `ak_${crypto.randomBytes(24).toString('hex')}`;
        const keyHash = this.hashApiKey(plainKey);
        const keyPrefix = plainKey.substring(0, 10);
        const apiKey = this.apiKeyRepository.create({
            projectId,
            name,
            keyHash,
            keyPrefix,
        });
        await this.apiKeyRepository.save(apiKey);
        return { apiKey, plainKey };
    }
    async revokeApiKey(projectId, keyId) {
        const result = await this.apiKeyRepository.update({ id: keyId, projectId }, { active: false });
        if (result.affected === 0) {
            throw new common_1.NotFoundException('API key not found');
        }
    }
    async deleteApiKey(keyId) {
        const result = await this.apiKeyRepository.delete({ id: keyId });
        if (result.affected === 0) {
            throw new common_1.NotFoundException('API key not found');
        }
    }
    async getApiKeys(projectId) {
        const apiKeys = await this.apiKeyRepository.find({
            where: { projectId },
            order: { createdAt: 'DESC' },
        });
        return {
            data: apiKeys.map((key) => ({
                id: key.id,
                name: key.name,
                keyPrefix: key.keyPrefix,
                active: key.active,
                createdAt: key.createdAt,
                lastUsedAt: key.lastUsedAt,
            })),
            meta: {
                total: apiKeys.length,
                page: 1,
                limit: apiKeys.length,
                totalPages: 1,
            },
        };
    }
    async updateSettings(projectId, data) {
        const project = await this.projectRepository.findOne({ where: { id: projectId } });
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        if (data.name) {
            project.name = data.name;
        }
        project.settings = {
            ...project.settings,
            allowSignup: data.allowSignup ?? project.settings?.allowSignup,
            requireEmailVerification: data.requireEmailVerification ?? project.settings?.requireEmailVerification,
            oauth: data.oauth ?? project.settings?.oauth,
        };
        return this.projectRepository.save(project);
    }
    hashApiKey(key) {
        return crypto.createHash('sha256').update(key).digest('hex');
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Project)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.ApiKey)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map