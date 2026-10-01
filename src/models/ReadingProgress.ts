import mongoose, { Schema, Model } from "mongoose";

export interface IReadingProgress {
  _id: string;
  userId: string;
  lastSurahId: number | null;
  lastAyahId: number | null;
  timeZone: string;
  surahProgress: Record<number, number>;
  dailyActivity: Record<string, number>;
  dailyReadVerseKeys: Record<string, string[]>;
  createdAt: Date;
  updatedAt: Date;
}

const ReadingProgressSchema = new Schema<IReadingProgress>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    lastSurahId: {
      type: Number,
      default: null,
    },
    lastAyahId: {
      type: Number,
      default: null,
    },
    timeZone: {
      type: String,
      default: "UTC",
      maxlength: 100,
    },
    surahProgress: {
      type: Map,
      of: Number,
      default: {},
    },
    dailyActivity: {
      type: Map,
      of: Number,
      default: {},
    },
    dailyReadVerseKeys: {
      type: Map,
      of: [String],
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const ReadingProgress: Model<IReadingProgress> = mongoose.models.ReadingProgress || mongoose.model<IReadingProgress>("ReadingProgress", ReadingProgressSchema);

export default ReadingProgress;
