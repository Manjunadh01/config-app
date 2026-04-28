"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function loadConfig() {
    const configPath = path_1.default.join(__dirname, "../../config/app.json");
    try {
        const rawData = fs_1.default.readFileSync(configPath, "utf-8");
        return JSON.parse(rawData);
    }
    catch (error) {
        console.error("Error loading config:", error);
        return { models: {} };
    }
}
