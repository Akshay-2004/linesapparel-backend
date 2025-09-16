import mongoose, { Document, Schema } from 'mongoose';

export interface IOtp extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  isExpired(): boolean;
}

const OtpSchema = new Schema<IOtp>({
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true
    },
    otp: { 
      type: String, 
      required: true,
      length: 6
    },
    expiresAt: { 
      type: Date, 
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
    }
}, { 
  timestamps: true 
});

// Create TTL index for automatic document expiration
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Helper method to generate 6-digit OTP
OtpSchema.statics.generateOTP = function(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper method to check if OTP is expired
OtpSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiresAt;
};

export default mongoose.model<IOtp>('Otp', OtpSchema);