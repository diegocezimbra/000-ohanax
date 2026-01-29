import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { AdminUser, AuthProvider } from '../database/entities';

interface CreateAdminUserDto {
  email: string;
  password: string;
  name?: string;
  provider?: AuthProvider;
  providerId?: string;
}

interface UpdateAdminUserDto {
  name?: string;
  avatar?: string;
}

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
  ) {}

  async findAll(options: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = options;

    const where: any = {};
    if (search) {
      where.email = ILike(`%${search}%`);
    }

    const [data, total] = await this.adminUserRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: data.map((u) => this.sanitize(u)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<AdminUser | null> {
    return this.adminUserRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<AdminUser | null> {
    return this.adminUserRepository.findOne({ where: { email } });
  }

  async findByEmailVerificationToken(token: string): Promise<AdminUser | null> {
    return this.adminUserRepository.findOne({ where: { emailVerificationToken: token } });
  }

  async findByPasswordResetToken(token: string): Promise<AdminUser | null> {
    return this.adminUserRepository.findOne({ where: { passwordResetToken: token } });
  }

  async findByProviderId(provider: AuthProvider, providerId: string): Promise<AdminUser | null> {
    return this.adminUserRepository.findOne({
      where: { provider, providerId },
    });
  }

  async create(data: CreateAdminUserDto): Promise<AdminUser> {
    const user = this.adminUserRepository.create({
      email: data.email,
      passwordHash: data.password,
      name: data.name,
      provider: data.provider || AuthProvider.EMAIL,
      providerId: data.providerId,
      emailVerified: data.provider !== AuthProvider.EMAIL,
    });

    return this.adminUserRepository.save(user);
  }

  async update(id: string, data: UpdateAdminUserDto): Promise<AdminUser> {
    const user = await this.adminUserRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Admin user not found');
    }

    Object.assign(user, data);
    return this.adminUserRepository.save(user);
  }

  async setEmailVerificationToken(id: string, token: string, expires: Date): Promise<void> {
    await this.adminUserRepository.update(id, {
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    });
  }

  async verifyEmail(id: string): Promise<void> {
    await this.adminUserRepository.update(id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });
  }

  async setPasswordResetToken(id: string, token: string, expires: Date): Promise<void> {
    await this.adminUserRepository.update(id, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });
  }

  async resetPassword(id: string, passwordHash: string): Promise<void> {
    await this.adminUserRepository.update(id, {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.adminUserRepository.update(id, {
      lastLoginAt: new Date(),
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.adminUserRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Admin user not found');
    }
  }

  async count(): Promise<number> {
    return this.adminUserRepository.count();
  }

  private sanitize(user: AdminUser) {
    const { passwordHash, emailVerificationToken, passwordResetToken, ...safe } = user;
    return safe;
  }
}
