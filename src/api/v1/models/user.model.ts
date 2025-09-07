import { Document, Schema, model } from "mongoose";
import {IUser, UserRole, UserStatus } from "../../../types/user.type";

// Interface cho model (IUser + Document) - Bổ sung thêm các trường như _id, createdAt, updatedAt,...
export interface IUserDocument extends IUser, Document {}

// Schema cho User
const userSchema = new Schema<IUserDocument>(
  {
    username: { type: String, required: true, unique: true },
    fullname: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: String,
    address: String,
    avatar: String,
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    token: { type: String, required: true }, 
    status: { type: String, enum: Object.values(UserStatus), required: true },
    deleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  }
);
// ✅ Indexes - Tạo mục lục để query nhanh
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ token: 1, deleted: 1 });
userSchema.index({ deleted: 1 });


// Model với type
const User = model<IUserDocument>("User", userSchema, "users");

export default User;
