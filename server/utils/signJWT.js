import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });
const signJwtToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not defined in environment variables");
  }

  const token = jwt.sign({ userId: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  console.log(token);
};

signJwtToken("bfb46ff6-9037-4c0a-8ecb-d1ba6f63d507");
