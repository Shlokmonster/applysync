import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";

// Load environment variables from .env file
dotenv.config();

const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.path);
  console.log('Origin:', req.headers.origin);
  
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', 'https://applysync.netlify.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return res.status(200).end();
  }
  
  console.log('CORS headers set:', {
    'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
    'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers'),
    'Access-Control-Allow-Credentials': res.getHeader('Access-Control-Allow-Credentials')
  });
  
  next();
});
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/appsync';

mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Database connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});


const emailschema = mongoose.Schema({
    email: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
});

const Email = mongoose.model("Email", emailschema);


// Email subscription endpoint
app.post("/subscribe", async (req, res) => {
    try {
        const { email } = req.body;
        
        // Basic validation
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide a valid email address" 
            });
        }
        
        // Check if email already exists
        const existingEmail = await Email.findOne({ email });
        if (existingEmail) {
            return res.status(200).json({ 
                success: true, 
                message: "You're already subscribed!" 
            });
        }
        
        // Save new email
        const newEmail = new Email({ email });
        await newEmail.save();
        
        res.status(201).json({ 
            success: true, 
            message: "Thanks for subscribing! We'll be in touch soon." 
        });
    } catch (err) {
        console.error('Subscription error:', err);
        res.status(500).json({ 
            success: false, 
            message: "Something went wrong. Please try again later." 
        });
    }
});



// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ 
        status: "UP",
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
    });
});

// Root endpoint
app.get("/", (req, res) => {
    res.json({ 
        message: "ApplySync API is running",
        version: "1.0.0",
        endpoints: [
            "POST /subscribe - Subscribe to newsletter",
            "GET /health - Check API status"
        ]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection! 💥 Shutting down...');
    console.error(err);
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception! 💥 Shutting down...');
    console.error(err);
    server.close(() => {
        process.exit(1);
    });
});






