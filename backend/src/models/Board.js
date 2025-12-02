import mongoose from 'mongoose';

const { Schema } = mongoose;

const memberSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member',
    },
  },
  { _id: false },
);

const backgroundSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['color', 'image'],
      default: 'color',
    },
    value: {
      type: String,
      required: true,
      default: '#0f172a',
      trim: true,
    },
    thumbnail: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false },
);

const boardSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: {
      type: [memberSchema],
      default: [],
    },
    background: {
      type: backgroundSchema,
      default: () => ({ type: 'color', value: '#0f172a', thumbnail: '' }),
    },
  },
  { timestamps: true },
);

boardSchema.index({ owner: 1 });
boardSchema.index({ 'members.user': 1 });
boardSchema.index({ title: 'text', description: 'text' });

export const Board = mongoose.models.Board || mongoose.model('Board', boardSchema);
