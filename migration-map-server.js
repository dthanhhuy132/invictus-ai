const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const PdfPrinter = require("pdfmake");
const {
  generateChecklistAI,
} = require("checklist-ai-gen/lib/checklist-generator");

// --- Config ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
let openai = null;

if (OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
} else {
  console.warn("Warning: OPENAI_API_KEY not set. Some features may not work.");
}

// --- Language map for dependency analysis ---
const EXT_LANG_MAP = {
  ".php": "php",
  ".js": "js",
  ".ts": "ts",
  ".py": "python",
  ".java": "java",
  ".cs": "csharp",
  ".rb": "ruby",
  ".sql": "sql",
};

// --- Helper: Recursively get all files ---
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// --- Dependency analyzers (reuse from migration-map.js) ---
function analyzePhpDependencies(content) {
  const regexes = [
    /require(?:_once)?\s*\(?['"](.+?)['"]\)?/g,
    /include(?:_once)?\s*\(?['"](.+?)['"]\)?/g,
    /use\s+([\w\\]+)/g,
    /new\s+([A-Za-z_][\w\\]*)/g,
    /([A-Za-z_][\w]*)::/g,
  ];
  return extractMatches(content, regexes);
}
function analyzeJsDependencies(content) {
  const regexes = [
    /require\(['"](.+?)['"]\)/g,
    /import\s+.*?from\s+['"](.+?)['"]/g,
    /import\s+['"](.+?)['"]/g,
    /export\s+.*?from\s+['"](.+?)['"]/g,
  ];
  return extractMatches(content, regexes);
}
function analyzePythonDependencies(content) {
  const regexes = [/import\s+([\w\.]+)/g, /from\s+([\w\.]+)\s+import/g];
  return extractMatches(content, regexes);
}
function analyzeJavaDependencies(content) {
  const regexes = [
    /import\s+([\w\.]+);/g,
    /extends\s+([A-Za-z_][\w]*)/g,
    /implements\s+([A-Za-z_][\w, ]*)/g,
  ];
  return extractMatches(content, regexes);
}
function analyzeCsharpDependencies(content) {
  const regexes = [
    /using\s+([\w\.]+);/g,
    /namespace\s+([\w\.]+)/g,
    /:([A-Za-z_][\w]*)/g,
  ];
  return extractMatches(content, regexes);
}
function analyzeRubyDependencies(content) {
  const regexes = [
    /require(_relative)?\s+['"](.+?)['"]/g,
    /include\s+([A-Za-z_][\w]*)/g,
    /<\s*([A-Za-z_][\w]*)/g,
  ];
  return extractMatches(content, regexes);
}
function extractMatches(content, regexes) {
  const deps = new Set();
  for (const regex of regexes) {
    let match;
    while ((match = regex.exec(content))) {
      for (let i = match.length - 1; i > 0; i--) {
        if (match[i]) {
          deps.add(match[i]);
          break;
        }
      }
    }
  }
  return Array.from(deps);
}
function analyzeDependencies(filePath, lang) {
  const content = fs.readFileSync(filePath, "utf-8");
  switch (lang) {
    case "php":
      return analyzePhpDependencies(content);
    case "js":
    case "ts":
      return analyzeJsDependencies(content);
    case "python":
      return analyzePythonDependencies(content);
    case "java":
      return analyzeJavaDependencies(content);
    case "csharp":
      return analyzeCsharpDependencies(content);
    case "ruby":
      return analyzeRubyDependencies(content);
    default:
      return [];
  }
}

// --- Database analysis ---
function extractSqlSchema(sqlContent) {
  const tables = [];
  const tableRegex = /CREATE TABLE (\w+) \(([^;]+)\);/gims;
  let match;
  while ((match = tableRegex.exec(sqlContent))) {
    const tableName = match[1];
    const columnsRaw = match[2];
    const columns = [];
    const columnRegex = /(\w+) ([A-Z]+[A-Z0-9_\(\)]*)(.*),?/gi;
    let colMatch;
    while ((colMatch = columnRegex.exec(columnsRaw))) {
      columns.push({
        name: colMatch[1],
        type: colMatch[2],
        extra: colMatch[3].trim(),
      });
    }
    tables.push({ table: tableName, columns });
  }
  return tables;
}
function findSqlQueriesInCode(content) {
  const queries = [];
  const regex =
    /SELECT .*?FROM .*?;|INSERT INTO .*?;|UPDATE .*?;|DELETE FROM .*?;/gis;
  let match;
  while ((match = regex.exec(content))) {
    queries.push(match[0]);
  }
  return queries;
}

// --- Summarize file for prompt ---
function summarizeFile(filePath) {
  const ext = path.extname(filePath);
  return `File: ${filePath} (type: ${ext})`;
}

// --- Main: Analyze files with OpenAI ---
async function analyzeGroupPrompt(
  { files, dependencies, dbSchema, dbQueries, from, to },
  openai
) {
  // If OpenAI is not configured, return a basic response
  if (!openai) {
    return {
      files,
      migrationPlan:
        "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable for AI-powered analysis.",
      suggestedTech: "Manual analysis required",
      databaseSuggestion: "Manual analysis required",
      note: "OpenAI integration not available",
    };
  }

  const prompt = `You are a system migration expert. The source system is written in ${from}. The target system must be in ${to}.
\nAnalyze the following group of files:\n${files
    .map((f) => summarizeFile(f))
    .join("\n")}\n\nDependency graph for this group:\n${JSON.stringify(
    dependencies,
    null,
    2
  )}\n\nDatabase schema (if any):\n${
    dbSchema && dbSchema.length ? JSON.stringify(dbSchema, null, 2) : "None"
  }\n\nSQL queries found in code (if any):\n${
    dbQueries && dbQueries.length
      ? dbQueries.map((q) => `- ${q}`).join("\n")
      : "None"
  }\n\n1. Propose a migration plan for this group, including how to refactor or group files/modules in the target language.\n2. Suggest equivalent technology, library, or framework in the target language if needed (e.g., SQL → NoSQL, REST → GraphQL, PHP array config → Node.js JSON config).\n3. If database is present, suggest a modern database solution (e.g., ORM, GraphQL, NoSQL, etc.) and how to migrate schema/queries.\n4. Provide migration notes specific to converting from ${from} to ${to}.\nReply in JSON format, in English:\n{\n  "files": [...],\n  "migrationPlan": "...",\n  "suggestedTech": "...",\n  "databaseSuggestion": "...",\n  "note": "..."}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });
    const text = completion.choices[0].message.content;
    const safeText = text.replace(/\\/g, "\\\\");
    return JSON.parse(safeText);
  } catch (err) {
    return {
      files,
      migrationPlan: "error",
      suggestedTech: "",
      databaseSuggestion: "",
      note: err.message,
    };
  }
}

async function analyzeGroupPromptWithRetry(group, openai, maxRetries = 3) {
  // If OpenAI is not configured, return immediately
  if (!openai) {
    return await analyzeGroupPrompt(group, openai);
  }

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeGroupPrompt(group, openai);
    } catch (err) {
      lastError = err;
      await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }
  return {
    files: group.files,
    migrationPlan: "error",
    suggestedTech: "",
    databaseSuggestion: "",
    note: `Failed after ${maxRetries} retries: ${lastError.message}`,
  };
}

function exportToPDF(data, pdfFile) {
  const fonts = {
    Roboto: {
      normal: "./fonts/Roboto-Regular.ttf",
      bold: "./fonts/Roboto-Bold.ttf",
      italics: "./fonts/Roboto-Regular.ttf",
      bolditalics: "./fonts/Roboto-Bold.ttf",
    },
  };
  const printer = new PdfPrinter(fonts);
  const tableBody = [
    [
      { text: "Files", bold: true },
      { text: "Migration Plan", bold: true },
      { text: "Suggested Tech", bold: true },
      { text: "Database Suggestion", bold: true },
      { text: "Note", bold: true },
    ],
    ...data.map((item) => [
      {
        text: (item.files || [])
          .map((f) => (typeof f === "string" ? f : f.file || JSON.stringify(f)))
          .join("\n"),
        noWrap: false,
      },
      { text: item.migrationPlan || "", noWrap: false },
      { text: item.suggestedTech || "", noWrap: false },
      { text: item.databaseSuggestion || "", noWrap: false },
      { text: item.note || "", noWrap: false },
    ]),
  ];
  const docDefinition = {
    pageOrientation: "landscape",
    content: [
      { text: "Migration Map", style: "header" },
      {
        text: `Generated at: ${new Date().toLocaleString()}`,
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: [100, 120, 100, 120, "*"],
          body: tableBody,
        },
        layout: "lightHorizontalLines",
      },
    ],
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
    },
  };
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  pdfDoc.pipe(fs.createWriteStream(pdfFile));
  pdfDoc.end();
}

function buildAdjacencyList(dependencyGraph) {
  const adj = {};
  for (const node of dependencyGraph) {
    if (!adj[node.file]) adj[node.file] = new Set();
    for (const dep of node.dependencies) {
      const depFile = dependencyGraph.find(
        (f) => f.file.endsWith(dep) || f.file === dep
      );
      if (depFile) {
        adj[node.file].add(depFile.file);
        if (!adj[depFile.file]) adj[depFile.file] = new Set();
        adj[depFile.file].add(node.file);
      }
    }
  }
  return adj;
}

function findConnectedComponents(dependencyGraph) {
  const adj = buildAdjacencyList(dependencyGraph);
  const visited = new Set();
  const groups = [];
  for (const file in adj) {
    if (!visited.has(file)) {
      const group = [];
      const stack = [file];
      while (stack.length) {
        const curr = stack.pop();
        if (!visited.has(curr)) {
          visited.add(curr);
          group.push(curr);
          for (const neighbor of adj[curr]) {
            if (!visited.has(neighbor)) stack.push(neighbor);
          }
        }
      }
      groups.push(group);
    }
  }
  const allFiles = new Set(dependencyGraph.map((d) => d.file));
  for (const file of allFiles) {
    if (!adj[file]) groups.push([file]);
  }
  return groups;
}

// --- Express server setup ---
const app = express();
app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/example/result", express.static("example/result"));

// Trang chủ: trả về file public/index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Route step 2: QA Checklist (interface + API)
app.get("/qa_test", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "qa_test.html"));
});

app.post("/qa_test", async (req, res) => {
  try {
    // Priority: get API key from header if available
    const apiKeyFromHeader = req.headers["x-openai-api-key"];
    const apiKey = apiKeyFromHeader || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res
        .status(400)
        .json({ error: "Missing OpenAI API key (header or env)" });
    }

    // Create OpenAI instance with corresponding key
    const OpenAI = require("openai");
    const openai = new OpenAI({ apiKey });

    const { srcDir, testType, outputFormats, excel, pdf } = req.body;

    if (!srcDir) {
      return res.status(400).json({ error: "Missing source directory" });
    }

    if (!fs.existsSync(srcDir)) {
      return res.status(400).json({ error: "Source directory does not exist" });
    }

    // Generate QA checklist using the checklist-ai-gen library
    const result = await generateChecklistAI({
      srcDir,
      testType: testType || "all",
      outputFormats: outputFormats || ["excel", "pdf"],
      excel: excel || "example/result/qa-checklist.xlsx",
      pdf: pdf || "example/result/qa-checklist.pdf",
      openai,
    });

    res.json({
      success: true,
      message: "QA Checklist generated successfully",
      excel: result.excel || null,
      pdf: result.pdf || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API generate checklist with AI
app.post("/generate_checklist", async (req, res) => {
  try {
    const apiKey = req.headers["x-openai-api-key"];
    if (!apiKey) return res.status(400).json({ error: "Missing API key" });
    const {
      srcDir,
      outputFile = "manual-checklist.xlsx",
      language = "en",
      generatePdf,
    } = req.body;
    if (!srcDir) return res.status(400).json({ error: "Missing srcDir" });
    const resultDir = path.join(__dirname, "example", "result");
    // Generate checklist with English headers
    const outPath = await generateChecklistAI({
      srcDir: path.isAbsolute(srcDir) ? srcDir : path.join(__dirname, srcDir),
      resultDir,
      outputFile,
      openaiApiKey: apiKey,
      language: "en", // Force English language
    });

    // If the library still generates Vietnamese headers, we need to replace them
    if (fs.existsSync(outPath)) {
      const XLSX = require("xlsx");
      const workbook = XLSX.readFile(outPath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON to modify headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Replace Vietnamese headers with English ones
      if (jsonData.length > 0) {
        const headers = jsonData[0];
        const englishHeaders = headers.map((header) => {
          if (typeof header === "string") {
            return header
              .replace(/Mô tả/i, "Description")
              .replace(/Bước thực hiện/i, "Steps")
              .replace(/Kết quả mong đợi/i, "Expected Result")
              .replace(/Ghi chú/i, "Notes")
              .replace(/Tiêu đề/i, "Title")
              .replace(/Tên/i, "Name")
              .replace(/Trạng thái/i, "Status")
              .replace(/Độ ưu tiên/i, "Priority");
          }
          return header;
        });

        jsonData[0] = englishHeaders;

        // Create new workbook with English headers
        const newWorkbook = XLSX.utils.book_new();
        const newWorksheet = XLSX.utils.aoa_to_sheet(jsonData);
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);

        // Write back to file
        XLSX.writeFile(newWorkbook, outPath);
      }
    }
    let pdfUrl = null;
    if (generatePdf) {
      // Read the xlsx file and convert to PDF
      const XLSX = require("xlsx");
      const PdfPrinter = require("pdfmake");
      const wb = XLSX.readFile(outPath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      // Create PDF
      const fonts = {
        Roboto: {
          normal: path.join(__dirname, "fonts", "Roboto-Regular.ttf"),
          bold: path.join(__dirname, "fonts", "Roboto-Bold.ttf"),
          italics: path.join(__dirname, "fonts", "Roboto-Regular.ttf"),
          bolditalics: path.join(__dirname, "fonts", "Roboto-Bold.ttf"),
        },
      };
      const printer = new PdfPrinter(fonts);
      const docDefinition = {
        pageOrientation: "landscape",
        content: [
          { text: "QA Test Checklist", style: "header" },
          {
            table: {
              headerRows: 1,
              body: data,
            },
            layout: "lightHorizontalLines",
          },
        ],
        styles: {
          header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        },
      };
      const pdfFile = path.join(
        resultDir,
        outputFile.replace(/\.xlsx$/, ".pdf")
      );
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      pdfDoc.pipe(fs.createWriteStream(pdfFile));
      pdfDoc.end();
      pdfUrl = `/example/result/${path.basename(pdfFile)}`;
    }
    const fileUrl = `/example/result/${outputFile}`;
    res.json({ fileUrl, pdfUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route bước 1: Migration Map (step 1)
app.get("/migration_map", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "migration_map.html"));
});

app.post("/migration_map", async (req, res) => {
  try {
    // Priority: get API key from header if available
    const apiKeyFromHeader = req.headers["x-openai-api-key"];
    const apiKey = apiKeyFromHeader || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res
        .status(400)
        .json({ error: "Missing OpenAI API key (header or env)" });
    }
    // Create OpenAI instance with corresponding key
    const OpenAI = require("openai");
    const openai = new OpenAI({ apiKey });
    const {
      sourceDir,
      from = "php",
      to = "nodejs",
      output = "migration-map.json",
      pdf,
    } = req.body;
    if (!sourceDir) {
      return res.status(400).json({ error: "Missing sourceDir" });
    }
    if (!fs.existsSync(sourceDir)) {
      return res.status(400).json({ error: "sourceDir does not exist" });
    }
    const files = getAllFiles(sourceDir);
    const dependencyGraph = [];
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const lang = EXT_LANG_MAP[ext] || "unknown";
      if (lang === "unknown") continue;
      if (!fs.existsSync(file)) continue;
      const deps = analyzeDependencies(file, lang);
      dependencyGraph.push({
        file: path.relative(sourceDir, file),
        type: lang,
        dependencies: deps,
      });
    }
    const sqlSchemaFiles = files.filter((f) => f.endsWith(".sql"));
    let dbSchema = [];
    for (const sqlFile of sqlSchemaFiles) {
      if (!fs.existsSync(sqlFile)) continue;
      const content = fs.readFileSync(sqlFile, "utf-8");
      dbSchema = dbSchema.concat(extractSqlSchema(content));
    }
    let dbQueries = [];
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if ([".php", ".js", ".ts", ".py", ".java", ".cs", ".rb"].includes(ext)) {
        if (!fs.existsSync(file)) continue;
        const content = fs.readFileSync(file, "utf-8");
        dbQueries = dbQueries.concat(findSqlQueriesInCode(content));
      }
    }
    const groups = findConnectedComponents(dependencyGraph);
    const results = [];
    for (const groupFiles of groups) {
      const groupDeps = dependencyGraph.filter((d) =>
        groupFiles.includes(d.file)
      );
      const groupDbQueries = [];
      for (const f of groupFiles) {
        const ext = path.extname(f).toLowerCase();
        if (
          [".php", ".js", ".ts", ".py", ".java", ".cs", ".rb"].includes(ext)
        ) {
          if (!fs.existsSync(f)) continue;
          const content = fs.readFileSync(f, "utf-8");
          groupDbQueries.push(...findSqlQueriesInCode(content));
        }
      }
      const group = {
        files: groupFiles,
        dependencies: groupDeps,
        dbSchema,
        dbQueries: groupDbQueries,
        from,
        to,
      };
      results.push(await analyzeGroupPromptWithRetry(group, openai));
    }
    fs.writeFileSync(output, JSON.stringify(results, null, 2), "utf-8");
    if (pdf) {
      exportToPDF(results, pdf);
    }
    // List files in output folder
    const outputDir = path.dirname(output);
    let outputFiles = [];
    if (fs.existsSync(outputDir)) {
      outputFiles = fs
        .readdirSync(outputDir)
        .filter((f) => fs.statSync(path.join(outputDir, f)).isFile())
        .map((f) => ({
          name: f,
          url: `/example/result/${f}`,
        }));
    }
    res.json({ results, output, pdf: pdf || null, outputFiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Migration map web server running at http://localhost:${PORT}`);
});
