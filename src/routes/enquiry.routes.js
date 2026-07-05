import { Router } from 'express';
import validateEnquiry from '../middlewares/enquiryValidation.js';
import requireAuth from '../../middleware/requireAuth.js';
import {
  submitEnquiry,
  getEnquiryStatus,
  getEnquiryById,
  listEnquiries,
  updateEnquiryStatus,
} from '../controllers/enquiryController.js';

const router = Router();

router.get('/status', getEnquiryStatus);
router.post('/submit', validateEnquiry, submitEnquiry);
router.get('/', requireAuth, listEnquiries);
router.put('/:id/status', requireAuth, updateEnquiryStatus);
router.get('/:id', getEnquiryById);

export default router;
