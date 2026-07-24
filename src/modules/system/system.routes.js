import { Router } from 'express';
import { getHealth, getReadiness } from './system.controller.js';

export const systemRouter = Router();

systemRouter.get('/health', getHealth);
systemRouter.get('/ready', getReadiness);
