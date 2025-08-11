import express from 'express';
import * as userController from '@/controllers/user.controller';
import { validateUserAccess, validateSuperAdminAccess } from '@/middleware/auth.middleware';

const userRouter = express.Router();

// All routes require authentication
userRouter.use(validateUserAccess);

// Routes accessible by authenticated users (for their own profile) and super admins
userRouter.get('/:id', userController.getUserById);
userRouter.put('/:id', userController.updateUserProfile);

// Address routes - users can manage their own address, super admins can manage any
userRouter.get('/:id/address', userController.getUserAddress);
userRouter.put('/:id/address', userController.updateUserAddress);
userRouter.delete('/:id/address', userController.deleteUserAddress);

// Routes accessible only by super admins
userRouter.get('/', validateSuperAdminAccess, userController.getAllUsers);
userRouter.get('/stats/overview', validateSuperAdminAccess, userController.getUserStats);
userRouter.patch('/:id/role', validateSuperAdminAccess, userController.changeUserRole);
userRouter.delete('/:id', validateSuperAdminAccess, userController.deleteUser);

export default userRouter;
