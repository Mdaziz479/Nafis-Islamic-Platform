import mongoose, { Schema, Model } from "mongoose";

export interface IUserSettings {
  _id: string;
  userId: string;
  selectedTranslationId: number | null;
  showTranslation: boolean;
  arabicFontSize: number;
  translationFontSize: number;
  wordByWordEnabled: boolean;
  selectedReciterId: number | null;
  playbackSpeed: number;
  volume: number;
  repeatMode: "off" | "ayah" | "surah";
  autoPlayNextAyah: boolean;
  selectedTafsirId: number | null;
  showTafsir: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    selectedTranslationId: {
      type: Number,
      default: null,
    },
    showTranslation: {
      type: Boolean,
      default: true,
    },
    arabicFontSize: {
      type: Number,
      default: 32,
    },
    translationFontSize: {
      type: Number,
      default: 16,
    },
    wordByWordEnabled: {
      type: Boolean,
      default: false,
    },
    selectedReciterId: {
      type: Number,
      default: null,
    },
    playbackSpeed: {
      type: Number,
      default: 1,
    },
    volume: {
      type: Number,
      default: 1,
    },
    repeatMode: {
      type: String,
      enum: ["off", "ayah", "surah"],
      default: "off",
    },
    autoPlayNextAyah: {
      type: Boolean,
      default: true,
    },
    selectedTafsirId: {
      type: Number,
      default: null,
    },
    showTafsir: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const UserSettings: Model<IUserSettings> = mongoose.models.UserSettings || mongoose.model<IUserSettings>("UserSettings", UserSettingsSchema);

export default UserSettings;
