import mongoose from 'mongoose';

const collaboratorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['Admin', 'Editor', 'Viewer'],
    default: 'Viewer',
  },
});

const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['file', 'folder'],
    default: 'file',
  },
  content: {
    type: String,
    default: '',
  },
  language: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, { timestamps: true });

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a room name'],
      trim: true,
    },
    description: {
      type: String,
      maxlength: [200, 'Description cannot be more than 200 characters'],
    },
    language: {
      type: String,
      default: 'javascript',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    collaborators: [collaboratorSchema],
    visibility: {
      type: String,
      enum: ['Public', 'Private'],
      default: 'Private',
      index: true,
    },
    inviteCode: {
      type: String,
      unique: true,
    },
    files: {
      type: [fileSchema],
      validate: [
        function(this: any, val: any[]) { return val.length <= 50; },
        '{PATH} exceeds the limit of 50 files'
      ]
    },
  },
  {
    timestamps: true,
  }
);

roomSchema.index({ name: 'text' });

// Generate invite code before saving if it doesn't exist
roomSchema.pre('save', async function () {
  if (!this.inviteCode) {
    this.inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
});

export default mongoose.model('Room', roomSchema);
