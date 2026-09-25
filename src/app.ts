import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "node:path";

import routes from "./routes/index.js";

const app = express();

// Security headers. crossOriginResourcePolicy is relaxed for
// /uploads specifically below so the frontend (different origin) can
// actually load images from it.
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// Serve uploaded media files
app.use(
  "/uploads",
  (req, res, next) => {
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(process.cwd(), "uploads"))
);

// API routes
app.use("/api/v1", routes);

export default app;