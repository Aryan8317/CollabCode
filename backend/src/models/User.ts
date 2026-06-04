import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      index: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: function(this: any) { return !this.githubId && !this.googleId; },
      minlength: 6,
      select: false,
    },
    githubId: {
      type: String,
      unique: true,
      sparse: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    title: {
      type: String,
    },
    bio: {
      type: String,
    },
    skills: [
      {
        type: String,
      },
    ],
    socialLinks: {
      github: String,
      twitter: String,
      linkedin: String,
      website: String,
    },
    stats: {
      contributions: { type: Number, default: 0, index: true },
      roomsCreated: { type: Number, default: 0 },
      collaborators: { type: Number, default: 0 },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
    emailOtpAttempts: {
      type: Number,
      default: 0,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    passwordResetOtpAttempts: {
      type: Number,
      default: 0,
    },
    editorSettings: {
      theme: { type: String, default: 'vs-dark' },
      fontSize: { type: Number, default: 14 },
      fontLigatures: { type: Boolean, default: false },
      lineNumbers: { type: String, default: 'on' },
      minimap: { type: Boolean, default: true },
    },
    notificationSettings: {
      email: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
