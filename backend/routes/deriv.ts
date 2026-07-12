import express from 'express';
import { derivController } from '../controllers/derivController.ts';

const router = express.Router();

router.get('/connect', derivController.handleConnect);
router.get('/oauth/callback', derivController.handleOAuthCallback);

export default router;
