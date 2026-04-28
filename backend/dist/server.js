"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const configEngine_1 = require("./configEngine");
const archiver_1 = __importDefault(require("archiver"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./auth"));
const authMiddleware_1 = require("./middleware/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const notification_1 = require("./utils/notification");
const fs_1 = __importDefault(require("fs"));
const db_1 = require("./db");
const app = (0, express_1.default)();
const upload = (0, multer_1.default)({ dest: "uploads/" });
// ✅ CORS (allow all for now, restrict later)
app.use((0, cors_1.default)({
    origin: "*"
}));
app.use(express_1.default.json());
// 🔐 Auth routes
app.use("/auth", auth_1.default);
// 🔧 Load config safely
const config = (0, configEngine_1.loadConfig)();
if (!config || !config.models) {
    throw new Error("Invalid config: models missing");
}
// ✅ CONFIG ROUTE
app.get("/config", (req, res) => {
    res.json({
        ui: {
            pages: [
                { type: "form" },
                { type: "table" }
            ]
        },
        models: config.models
    });
});
// 🔌 EXPORT PROJECT (ZIP)
app.get("/export-project", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const folderPath = path_1.default.join(__dirname, "..");
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", "attachment; filename=project.zip");
        const archive = (0, archiver_1.default)("zip", { zlib: { level: 9 } });
        archive.on("error", (err) => {
            throw err;
        });
        archive.pipe(res);
        archive.glob("**/*", {
            cwd: folderPath,
            ignore: ["node_modules/**", "uploads/**"]
        });
        await archive.finalize();
        (0, notification_1.sendNotification)("Project exported as ZIP");
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Export failed" });
    }
});
// 📊 CSV UPLOAD ROUTE
app.post("/upload-csv/:model", authMiddleware_1.authMiddleware, upload.single("file"), (req, res) => {
    const model = req.params.model;
    const table = model.toLowerCase();
    if (!config.models[model]) {
        return res.status(400).json({ error: "Invalid model" });
    }
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    const file = req.file;
    const results = [];
    fs_1.default.createReadStream(file.path)
        .pipe((0, csv_parser_1.default)())
        .on("data", (data) => results.push(data))
        .on("end", async () => {
        try {
            for (const row of results) {
                await db_1.db.query(`INSERT INTO ${table} (data) VALUES ($1)`, [row]);
            }
            fs_1.default.unlinkSync(file.path);
            (0, notification_1.sendNotification)(`CSV uploaded for ${model} with ${results.length} records`);
            res.json({
                message: "CSV uploaded successfully",
                rowsInserted: results.length
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: "DB insert failed" });
        }
    })
        .on("error", (err) => {
        console.error(err);
        res.status(500).json({ error: "CSV processing failed" });
    });
});
// 🔁 Dynamic CRUD routes
Object.keys(config.models).forEach((model) => {
    const table = model.toLowerCase();
    app.post(`/api/${model}`, authMiddleware_1.authMiddleware, async (req, res) => {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                return res.status(400).json({ error: "Empty request body" });
            }
            await db_1.db.query(`INSERT INTO ${table} (data) VALUES ($1)`, [req.body]);
            (0, notification_1.sendNotification)(`${model} created successfully`);
            res.json({
                message: `${model} created`,
                data: req.body
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: "DB error" });
        }
    });
    app.get(`/api/${model}`, authMiddleware_1.authMiddleware, async (req, res) => {
        try {
            const result = await db_1.db.query(`SELECT * FROM ${table}`);
            res.json(result.rows);
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: "DB error" });
        }
    });
});
// ❌ 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});
// 🔥 Global error handler
app.use((err, req, res, next) => {
    console.error("🔥 Global Error:", err);
    res.status(500).json({ error: "Something went wrong" });
});
// 🚀 DEPLOY FIX (VERY IMPORTANT)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    (0, notification_1.sendNotification)("Server started");
});
