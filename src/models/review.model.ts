import mongoose, { Document, Schema } from "mongoose";

export interface IReview extends Document {
  userId: mongoose.Types.ObjectId;
  productId: string;
  rating: number;
  comment: string;
  stars: number;
  imageUrls?: string[];
  verifiedBuyer?: boolean;
  foundHelpful?: number;
  notHelpful?: number;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    productId: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    stars: {
      type: Number,
      default: 0,
    },
    imageUrls: {
      type: [String],
      default: [],
    },
    verifiedBuyer: {
      type: Boolean,
      default: false,
    },
    foundHelpful: {
      type: Number,
      default: 0,
    },
    notHelpful: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Review = mongoose.model<IReview>("Review", reviewSchema);
