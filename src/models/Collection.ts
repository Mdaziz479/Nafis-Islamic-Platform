import mongoose, { Schema, Model } from "mongoose";

export interface ICollection {
  _id: string;
  userId: string;
  name: string;
  verseKeys: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    verseKeys: {
      type: [String],
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

CollectionSchema.index({ userId: 1, name: 1 }, { unique: true });

const Collection: Model<ICollection> = mongoose.models.Collection || mongoose.model<ICollection>("Collection", CollectionSchema);

export default Collection;
