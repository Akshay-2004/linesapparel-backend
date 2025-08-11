import mongoose, { Document, Schema } from "mongoose";

export interface TestimonialData extends Document {
  name: string;
  stars: number;
  published: boolean;
  quote: string;
  imageUrl?: string; // Made optional
  occupation: string;
  location: string;
}

const testimonialSchema = new Schema<TestimonialData>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    stars: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    published: {
      type: Boolean,
      default: false,
    },
    quote: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: false, // Made optional
    },
    occupation: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Testimonial = mongoose.model<TestimonialData>("Testimonial", testimonialSchema);