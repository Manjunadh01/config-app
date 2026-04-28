"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const router = (0, express_1.Router)();
// Dummy user store (replace with DB later)
const users = [];
const SECRET = "mysecretkey";
// 🔐 REGISTER
router.post("/register", async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    users.push({ username, password: hashedPassword });
    res.json({ message: "User registered" });
});
// 🔑 LOGIN
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (!user)
        return res.status(400).json({ error: "User not found" });
    const valid = await bcrypt_1.default.compare(password, user.password);
    if (!valid)
        return res.status(400).json({ error: "Invalid password" });
    const token = jsonwebtoken_1.default.sign({ username }, SECRET, { expiresIn: "1h" });
    res.json({ token });
});
exports.default = router;
