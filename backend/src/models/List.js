import mongoose from 'mongoose';

const { Schema } = mongoose;

const listSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    board: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true
    },
    position: {
      type: Number,
      required: true,
      min: 0
    },
    archived: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

listSchema.index({ board: 1, position: 1 }, { unique: true });

export const List = mongoose.models.List || mongoose.model('List', listSchema);
