import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import routes from "./routes/index.js";

const app = express();

// Security headers
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

// API routes
app.use("/api/v1", routes);

export default app;