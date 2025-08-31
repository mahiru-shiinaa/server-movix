import { Document, Schema, model } from "mongoose";

// Interface cho Category
export interface ICity extends Document {
  name: string;
}

// Schema cho City
const citySchema = new Schema<ICity>(
  {
    name: { type: String, required: true },
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  }
);

// Model với type
const City = model<ICity>("City", citySchema, "cities");

export default City;
