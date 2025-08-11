import mongoose, { Document } from "mongoose";

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    price: number;
    title: string;
    image: string;
  }>;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const cartSchema = new mongoose.Schema<ICart>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    items: [
      {
        productId: { type: String, required: true },
        variantId: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        title: { type: String, required: true },
        image: { type: String },
      },
    ],
    totalPrice: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const Cart = mongoose.model<ICart>("Cart", cartSchema);
