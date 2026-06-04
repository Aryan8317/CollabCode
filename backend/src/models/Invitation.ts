import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    role: {
      type: String,
      enum: ['Admin', 'Editor', 'Viewer'],
      default: 'Viewer',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate pending invitations
invitationSchema.index({ receiverEmail: 1, roomId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

export default mongoose.model('Invitation', invitationSchema);
