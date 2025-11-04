import mongoose, { Document } from "mongoose";

interface IInterest extends Document {
    email: string;
    createdAt: Date;
}

const interestSchema = new mongoose.Schema<IInterest>({
    email: {
        type: String,
        required: true,
    },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});

export default mongoose.model<IInterest>("Interest", interestSchema);