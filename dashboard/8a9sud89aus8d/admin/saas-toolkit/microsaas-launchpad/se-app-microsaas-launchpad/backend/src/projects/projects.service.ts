import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Project, ApiKey } from '../database/entities';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  async findAll(options: { page: number; limit: number; ownerId?: string }) {
    const { page, limit, ownerId } = options;

    const where: any = {};
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

  async findById(id: string): Promise<Project | null> {
    return this.projectRepository.findOne({
      where: { id },
      relations: ['apiKeys'],
    });
  }

  async findByApiKey(apiKey: string): Promise<Project | null> {
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

  async create(ownerId: string, data: CreateProjectDto): Promise<Project> {
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

  async update(id: string, data: UpdateProjectDto): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (data.settings) {
      project.settings = { ...project.settings, ...data.settings };
      delete data.settings;
    }

    Object.assign(project, data);
    return this.projectRepository.save(project);
  }

  async remove(id: string): Promise<void> {
    const result = await this.projectRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Project not found');
    }
  }

  async createApiKey(projectId: string, name: string): Promise<{ apiKey: ApiKey; plainKey: string }> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
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

  async revokeApiKey(projectId: string, keyId: string): Promise<void> {
    const result = await this.apiKeyRepository.update(
      { id: keyId, projectId },
      { active: false },
    );

    if (result.affected === 0) {
      throw new NotFoundException('API key not found');
    }
  }

  async deleteApiKey(keyId: string): Promise<void> {
    const result = await this.apiKeyRepository.delete({ id: keyId });
    if (result.affected === 0) {
      throw new NotFoundException('API key not found');
    }
  }

  async getApiKeys(projectId: string) {
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

  async updateSettings(projectId: string, data: any): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
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

  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}
