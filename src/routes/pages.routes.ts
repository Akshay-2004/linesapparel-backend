import express from 'express';
import * as pageController from '@/controllers/page.controller';
import { validateUserAccess, validateAdminAccess } from '@/middleware/auth.middleware';

const pagesRouter = express.Router();

// Public routes - Homepage specific
pagesRouter.get('/homepage', pageController.getHomepage);

// Public routes - Navbar configuration
pagesRouter.get('/navbar', pageController.getNavbar);

// Public routes - Legal pages
pagesRouter.get('/legal', pageController.getAllLegalPages);
pagesRouter.get('/legal/types', pageController.getLegalPageTypes);
pagesRouter.get('/legal/:type', pageController.getLegalPageByType);

// Protected routes (require authentication)
pagesRouter.use(validateUserAccess);

// Admin only routes - Homepage management
pagesRouter.use(validateAdminAccess);

pagesRouter.post('/homepage', pageController.uploadHomepageImages, pageController.createHomepage);
pagesRouter.put('/homepage', pageController.uploadHomepageImages, pageController.updateHomepage);
pagesRouter.delete('/homepage', pageController.deleteHomepage);

// Admin only routes - Navbar management
pagesRouter.put('/navbar', pageController.updateNavbar);
pagesRouter.delete('/navbar', pageController.deleteNavbar);

// Admin only routes - Legal pages management
pagesRouter.put('/legal/:type', pageController.uploadLegalDocument, pageController.createOrUpdateLegalPage);
pagesRouter.delete('/legal/:type', pageController.deleteLegalPage);

// Generic page routes (if needed for other pages)
pagesRouter.get('/', pageController.getAllPages);
pagesRouter.get('/:identifier', pageController.getPage);
pagesRouter.post('/', pageController.uploadHomepageImages, pageController.createPage);
pagesRouter.put('/:id', pageController.uploadHomepageImages, pageController.updatePage);
pagesRouter.delete('/:id', pageController.deletePage);

export default pagesRouter;
