import mongoose, { Schema, Model } from "mongoose";

export interface IStreak {
  _id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const StreakSchema = new Schema<IStreak>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    currentStreak: {
      type: Number,
      required: true,
      default: 0,
    },
    longestStreak: {
      type: Number,
      required: true,
      default: 0,
    },
    lastActivityDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Streak: Model<IStreak> = mongoose.models.Streak || mongoose.model<IStreak>("Streak", StreakSchema);

export default Streak;
