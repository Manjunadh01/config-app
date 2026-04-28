
import fs from "fs";
import path from "path";

export function loadConfig() {
  const configPath = path.join(__dirname, "../../config/app.json");

  try {
    const rawData = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Error loading config:", error);
    return { models: {} };
  }
}