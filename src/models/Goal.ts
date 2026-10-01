import mongoose, { Schema, Model } from "mongoose";

export interface IGoal {
  _id: string;
  userId: string;
  targetAyahsPerDay: number;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    targetAyahsPerDay: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

const Goal: Model<IGoal> = mongoose.models.Goal || mongoose.model<IGoal>("Goal", GoalSchema);

export default Goal;
