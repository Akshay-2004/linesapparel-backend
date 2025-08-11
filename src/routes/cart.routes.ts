import { Router } from "express";
import * as cartController from "@/controllers/cart.controller";
import { validateAdminAccess } from "@/middleware/auth.middleware";

const cartRouter = Router();

// All cart routes require user authentication (handled in api.router.ts)

// User cart routes
cartRouter.get("/", cartController.getCart);
cartRouter.post("/add", cartController.addToCart);
cartRouter.put("/update/:variantId", cartController.updateCartItem);
cartRouter.delete("/remove/:variantId", cartController.removeFromCart);
cartRouter.delete("/clear", cartController.clearCart);
cartRouter.get("/count", cartController.getCartItemCount);

// Admin only routes
cartRouter.get("/admin/all", validateAdminAccess, cartController.getAllCarts);
cartRouter.delete("/admin/:id", validateAdminAccess, cartController.deleteCart);

export default cartRouter;
