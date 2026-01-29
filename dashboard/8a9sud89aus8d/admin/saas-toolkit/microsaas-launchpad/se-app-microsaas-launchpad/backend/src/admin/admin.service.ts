import { Injectable } from '@nestjs/common';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class AdminService {
  constructor(private readonly projectsService: ProjectsService) {}

  async getStats() {
    const projects = await this.projectsService.findAll({ page: 1, limit: 1 });

    return {
      totalProjects: projects.meta.total,
      apiCalls: 0, // TODO: Implement API call tracking
    };
  }

  async getDashboard() {
    const stats = await this.getStats();
    const recentProjects = await this.projectsService.findAll({
      page: 1,
      limit: 5,
    });

    return {
      stats,
      recentProjects: recentProjects.data,
    };
  }
}
