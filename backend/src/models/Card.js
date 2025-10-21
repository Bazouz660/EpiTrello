import mongoose from 'mongoose';

const { Schema } = mongoose;

const labelSchema = new Schema(
  {
    color: {
      type: String,
      required: true,
      trim: true
    },
    text: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const checklistItemSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true
    },
    completed: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const cardSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    list: {
      type: Schema.Types.ObjectId,
      ref: 'List',
      required: true,
      index: true
    },
    position: {
      type: Number,
      required: true,
      min: 0
    },
    labels: {
      type: [labelSchema],
      default: []
    },
    dueDate: {
      type: Date,
      default: null
    },
    checklist: {
      type: [checklistItemSchema],
      default: []
    },
    assignedMembers: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      default: []
    },
    archived: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

cardSchema.index({ list: 1, position: 1 }, { unique: true });
cardSchema.index({ title: 'text', description: 'text' });

export const Card = mongoose.models.Card || mongoose.model('Card', cardSchema);
