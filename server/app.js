import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import Razorpay from "razorpay";


const app = express();

// Security & Parse Middlewares
app.use(express.json());

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// CORS Configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Pragma",
      "Origin",
      "Accept",
    ],
    exposedHeaders: ["Set-Cookie"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);
// Cache Control Headers
app.use((req, res, next) => {
  res.header("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.header("Pragma", "no-cache");
  res.header("Expires", "0");
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "DENY");
  res.header("X-XSS-Protection", "1; mode=block");
  res.header(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  next();
});
// Static Files
app.use(express.static("public/upload"));

// Initialize Razorpay
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

  console.log("Razorpay Initialized Successfully:");
} catch (error) {
  console.error("Razorpay Initialization Error:", error);
}

export { razorpay };



// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;
