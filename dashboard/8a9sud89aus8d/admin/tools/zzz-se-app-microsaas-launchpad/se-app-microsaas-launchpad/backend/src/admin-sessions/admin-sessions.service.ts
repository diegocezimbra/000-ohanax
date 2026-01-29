import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AdminSession } from '../database/entities';

@Injectable()
export class AdminSessionsService {
  constructor(
    @InjectRepository(AdminSession)
    private readonly adminSessionRepository: Repository<AdminSession>,
  ) {}

  async create(data: {
    adminUserId: string;
    refreshToken: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<AdminSession> {
    const session = this.adminSessionRepository.create(data);
    return this.adminSessionRepository.save(session);
  }

  async findByRefreshToken(refreshToken: string): Promise<AdminSession | null> {
    return this.adminSessionRepository.findOne({
      where: { refreshToken, active: true },
      relations: ['adminUser'],
    });
  }

  async findByToken(token: string): Promise<AdminSession | null> {
    return this.adminSessionRepository.findOne({
      where: { refreshToken: token, active: true },
      relations: ['adminUser'],
    });
  }

  async findByAdminUserId(adminUserId: string): Promise<AdminSession[]> {
    return this.adminSessionRepository.find({
      where: { adminUserId, active: true },
      order: { createdAt: 'DESC' },
    });
  }

  async revokeSession(id: string): Promise<void> {
    await this.adminSessionRepository.update(id, { active: false });
  }

  async revokeAllAdminUserSessions(adminUserId: string): Promise<void> {
    await this.adminSessionRepository.update(
      { adminUserId, active: true },
      { active: false },
    );
  }

  async revokeByRefreshToken(refreshToken: string): Promise<void> {
    await this.adminSessionRepository.update(
      { refreshToken },
      { active: false },
    );
  }

  async cleanExpiredSessions(): Promise<void> {
    await this.adminSessionRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  async countActiveSessions(adminUserId: string): Promise<number> {
    return this.adminSessionRepository.count({
      where: { adminUserId, active: true },
    });
  }
}
