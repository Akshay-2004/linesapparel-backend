import { Router } from 'express';
import shopifyRouter from '@/routes/shopify.routes';
import authRouter from '@/routes/auth.routes';
import pagesRouter from '@/routes/pages.routes';
import testimonialsRouter from '@/routes/testimonials.routes';
import inquiryRouter from '@/routes/inquiry.routes';
import userRouter from '@/routes/user.routes';
import reviewsRouter from '@/routes/reviews.routes';
import cartRouter from './routes/cart.routes';
import dashboardRouter from './routes/dashboard.routes';
import interestRouter from '@/routes/interest.routes';
import { validateUserAccess } from './middleware/auth.middleware';

const apiRouter = Router();

// Import all routers
apiRouter.use('/shopify', shopifyRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use('/pages', pagesRouter);
apiRouter.use('/testimonials', testimonialsRouter);
apiRouter.use('/inquiries', inquiryRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/reviews', reviewsRouter);
apiRouter.use('/cart', validateUserAccess ,cartRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/interests', interestRouter);

export default apiRouter;