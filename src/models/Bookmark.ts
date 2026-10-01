import mongoose, { Schema, Model } from "mongoose";

export interface IBookmark {
  _id: string;
  userId: string;
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    verseKey: {
      type: String,
      required: true,
    },
    surahId: {
      type: Number,
      required: true,
    },
    ayahNumber: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

BookmarkSchema.index({ userId: 1, verseKey: 1 }, { unique: true });

const Bookmark: Model<IBookmark> = mongoose.models.Bookmark || mongoose.model<IBookmark>("Bookmark", BookmarkSchema);

export default Bookmark;
