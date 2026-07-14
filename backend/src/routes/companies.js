import { Router } from 'express';
import { listCompanies, getCompany } from '../controllers/companiesController.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = Router();
const cache = cacheMiddleware(300); // 5 minutes

router.get('/', cache, listCompanies);
router.get('/:id', cache, getCompany);

export default router;
