import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiKey } from './api-key.entity';
import { AdminUser } from './admin-user.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => AdminUser)
  @JoinColumn({ name: 'owner_id' })
  owner: AdminUser;

  @Column({ name: 'allowed_domains', type: 'jsonb', default: [] })
  allowedDomains: string[];

  @Column({ type: 'jsonb', default: {} })
  settings: {
    theme?: {
      primaryColor?: string;
      backgroundColor?: string;
      logoUrl?: string;
    };
    [key: string]: any;
  };

  @OneToMany(() => ApiKey, (apiKey) => apiKey.project)
  apiKeys: ApiKey[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
