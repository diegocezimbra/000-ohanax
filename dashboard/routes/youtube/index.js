import { Router } from 'express';
import projectRoutes from './projects.js';
import settingRoutes from './settings.js';
import sourceRoutes from './sources.js';
import researchRoutes from './research.js';
import topicRoutes from './topics.js';
import storyRoutes from './stories.js';
import scriptRoutes from './scripts.js';
import visualRoutes from './visuals.js';
import thumbnailRoutes from './thumbnails.js';
import narrationRoutes from './narrations.js';
import videoRoutes from './videos.js';
import publishingRoutes from './publishing.js';
import pipelineRoutes from './pipeline.js';
import jobRoutes from './jobs.js';

// Initialize all YouTube tables on first import
import '../../services/youtube/init-tables.js';

const router = Router();

// Project-level routes
router.use('/projects', projectRoutes);

// Project-scoped routes (require :projectId)
router.use('/projects/:projectId/settings', settingRoutes);
router.use('/projects/:projectId/sources', sourceRoutes);
router.use('/projects/:projectId/research', researchRoutes);
router.use('/projects/:projectId/topics', topicRoutes);

// Topic-scoped routes (require :projectId and :topicId)
router.use('/projects/:projectId/topics/:topicId/story', storyRoutes);
router.use('/projects/:projectId/topics/:topicId/script', scriptRoutes);
router.use('/projects/:projectId/topics/:topicId/visuals', visualRoutes);
router.use('/projects/:projectId/topics/:topicId/thumbnail', thumbnailRoutes);
router.use('/projects/:projectId/topics/:topicId/narration', narrationRoutes);
router.use('/projects/:projectId/topics/:topicId/video', videoRoutes);

// Publishing and pipeline views
router.use('/projects/:projectId/publishing', publishingRoutes);
router.use('/projects/:projectId/pipeline', pipelineRoutes);

// Global job queue monitoring
router.use('/jobs', jobRoutes);

export default router;
