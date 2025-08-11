import mongoose, { Document, Schema } from "mongoose";

export interface IInquiry extends Document {
  name: string;
  email: string;
  purpose: string;
  message: string;
  resolved: boolean;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvingMessage?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

const InquirySchema: Schema = new Schema<IInquiry>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true },
  purpose: { 
    type: String, 
    required: true,
    trim: true
  },
  message: { type: String, required: true },
  resolved: { type: Boolean, default: false },
  resolvedBy: { type: Schema.Types.ObjectId, required: false, ref: "User" },
  resolvingMessage: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, required: false },
});

export const Inquiry = mongoose.model<IInquiry>("Inquiry", InquirySchema);
