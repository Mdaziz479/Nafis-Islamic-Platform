import mongoose, { Schema, Model } from "mongoose";

export interface INote {
  _id: string;
  userId: string;
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
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
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

NoteSchema.index({ userId: 1, verseKey: 1 }, { unique: true });

const Note: Model<INote> = mongoose.models.Note || mongoose.model<INote>("Note", NoteSchema);

export default Note;
