import mongoose, { Document } from "mongoose";

export interface ITextBanner  extends Document {
    content: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const textBannerSchema = new mongoose.Schema<ITextBanner>({
    content: { type: String, required: true },
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true
});

export const TextBanner = mongoose.model<ITextBanner>("TextBanner", textBannerSchema);