const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { generateMigrationMap } = require("migration-map");
const { generateChecklistAI } = require("checklist-generator");
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Multer config: lưu file vào thư mục tạm theo folder gốc
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Tạo thư mục tạm duy nhất cho mỗi lần upload
    if (!req.tmpUploadDir) {
      const tmpDir = "uploads/tmp_" + crypto.randomBytes(6).toString("hex");
      fs.mkdirSync(tmpDir, { recursive: true });
      req.tmpUploadDir = tmpDir;
    }
    cb(null, req.tmpUploadDir);
  },
  filename: function (req, file, cb) {
    // Lưu đúng cấu trúc folder gốc
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

app.post("/upload_src_folder", upload.any(), (req, res) => {
  // Trả về đường dẫn thư mục tạm đã upload
  res.json({ tmpDir: req.tmpUploadDir });
});

// Serve HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/migration_map", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "migration_map.html"));
});
app.get("/qa_test", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "qa_test.html"));
});

// Serve static result files
app.use(
  "/example/result",
  express.static(path.join(__dirname, "example/result"))
);

// API: List result files
app.get("/api/results", (req, res) => {
  const resultDir = path.join(__dirname, "example/result");
  try {
    const files = require("fs")
      .readdirSync(resultDir)
      .filter((f) => require("fs").statSync(path.join(resultDir, f)).isFile());
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Migration Map
app.post("/migration_map", async (req, res) => {
  try {
    const { sourceDir, from, to, output, pdf } = req.body;
    // Gọi thư viện migration-map
    const result = generateMigrationMap({ sourceDir, from, to, output, pdf });
    res.json({ results: result.files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: QA Checklist Generator
app.post("/qa_test", async (req, res) => {
  try {
    const { srcDir, outputFile, language } = req.body;
    const apiKey = req.headers["x-openai-api-key"];
    if (!apiKey)
      return res.status(400).json({ error: "Missing OpenAI API key" });
    // Gọi thư viện checklist-generator
    const outputPath = await generateChecklistAI({
      srcDir,
      resultDir: path.dirname(outputFile),
      outputFile: path.basename(outputFile),
      openaiApiKey: apiKey,
      language,
    });
    res.json({ outputFile: outputPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: List folders for folder picker
app.get("/api/list-folders", (req, res) => {
  const root = req.query.root || ".";
  const absRoot = path.resolve(root);
  try {
    const items = require("fs")
      .readdirSync(absRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    res.json({ folders: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
