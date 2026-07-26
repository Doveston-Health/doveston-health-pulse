import { Router } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { getHealth, getReadiness } from './system.controller.js';

export const systemRouter = Router();

systemRouter.get('/health', getHealth);
systemRouter.get('/ready', asyncHandler(getReadiness));
