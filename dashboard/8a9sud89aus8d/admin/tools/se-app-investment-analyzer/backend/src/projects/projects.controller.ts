import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ProjectsService } from './projects.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AdminUser } from '../database/entities';

interface ProjectRequest extends ExpressRequest {
  adminUser?: AdminUser;
}

@Controller('projects')
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(
    @Request() req: ProjectRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.projectsService.findAll({
      page: +page,
      limit: +limit,
      ownerId: req.adminUser!.id,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.projectsService.findById(id);
  }

  @Post()
  async create(
    @Request() req: ProjectRequest,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(req.adminUser!.id, createProjectDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Get(':id/api-keys')
  async getApiKeys(@Param('id') id: string) {
    return this.projectsService.getApiKeys(id);
  }

  @Post(':id/api-keys')
  async createApiKey(@Param('id') id: string, @Body('name') name: string) {
    return this.projectsService.createApiKey(id, name);
  }

  @Delete(':id/api-keys/:keyId')
  async revokeApiKey(@Param('id') id: string, @Param('keyId') keyId: string) {
    return this.projectsService.revokeApiKey(id, keyId);
  }
}
