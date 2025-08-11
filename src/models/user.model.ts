import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt'

export enum EUserRole {
    client = 'client',
    admin = 'admin',
    superAdmin = 'super_admin'
}

export interface IUser extends Document {
    email: string;
    password: string;
    role: EUserRole;
    name: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
    }
    phone?: string;
    verified: boolean;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    address: {
        street: {
            type: String,
            trim: true,
            required: false
        },
        city: {
            type: String,
            trim: true,
            required: false
        },
        state: {
            type: String,
            trim: true,
            required: false
        },
        zip: {
            type: String,
            trim: true,
            required: false
        },
        country: {
            type: String,
            trim: true,
            required: false
        }
    },
    role: {
        type: String,
        enum: Object.values(EUserRole),
        default: EUserRole.client
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        trim: true
    },
    verified: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);