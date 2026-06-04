import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      default: 'Snapshot',
    },
    files: [
      {
        name: String,
        path: String,
        type: { type: String, enum: ['file', 'folder'] },
        content: String,
        language: String,
        _id: false
      }
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Version', versionSchema);
