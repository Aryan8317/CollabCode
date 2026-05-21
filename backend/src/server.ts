import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('CollabCode Backend is running!');
});

const connectDB = async () => {
  try {
    // Placeholder for MongoDB URI
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/collabcode';
    // await mongoose.connect(mongoURI);
    console.log('MongoDB connection placeholder (uncomment when URI is ready)');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});
