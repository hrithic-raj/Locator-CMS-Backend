import "dotenv/config";
import readline from "node:readline";

import { connectDatabase } from "../config/database.js";
import { AdminUser } from "../models/AdminUser.js";
import { hashPassword } from "../utils/password.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function createAdmin(): Promise<void> {
  try {
    await connectDatabase();

    console.log("\n=== Create Admin User ===\n");

    const name = (await askQuestion("Name: ")).trim();
    const email = (await askQuestion("Email: ")).trim().toLowerCase();
    const password = await askQuestion("Password: ");

    if (!name || !email || !password) {
      throw new Error("Name, email, and password are required.");
    }

    const existingUser = await AdminUser.findOne({ email });

    if (existingUser) {
      throw new Error(`A user with email "${email}" already exists.`);
    }

    const passwordHash = await hashPassword(password);

    const admin = await AdminUser.create({
      name,
      email,
      passwordHash,
      role: "admin",
      refreshToken: null,
      lastLoginAt: null,
    });

    console.log("\nAdmin user created successfully.");
    console.log(`ID:    ${admin._id}`);
    console.log(`Name:  ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role:  ${admin.role}`);
  } catch (error) {
    console.error("\nFailed to create admin user.");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

createAdmin();