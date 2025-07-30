#!/usr/bin/env node
// migration-map.js
// All-in-one CLI tool: Generate migration map using OpenAI, with dependency & database analysis

const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const { Command } = require("commander");
const PdfPrinter = require("pdfmake");

// --- Config ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Please set your OPENAI_API_KEY environment variable.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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

// --- CLI setup ---
const program = new Command();
program
  .argument("<sourceDir>", "Source code directory to analyze")
  .option("-o, --output <file>", "Output file", "migration-map.json")
  .option("--pdf <file>", "Export migration map to PDF")
  .option(
    "--from <sourceLang>",
    "Source programming language (e.g., php, java, nodejs)",
    "php"
  )
  .option(
    "--to <targetLang>",
    "Target programming language (e.g., nodejs, java, python)",
    "nodejs"
  )
  .parse();

const [sourceDir] = program.args;
const { output, pdf, from, to } = program.opts();

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

// --- Dependency analyzers for each language ---
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
  // Extract tables, columns, foreign keys from .sql file
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
  // Tìm các truy vấn SQL trong code (rất cơ bản)
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
async function analyzeGroupPrompt({
  files,
  dependencies,
  dbSchema,
  dbQueries,
  from,
  to,
}) {
  // Send prompt to AI with group file info, dependencies, schema, queries, source/target language
  const prompt = `You are a system migration expert. The source system is written in ${from}. The target system must be in ${to}.

Analyze the following group of files:
${files.map((f) => summarizeFile(f)).join("\n")}

Dependency graph for this group:
${JSON.stringify(dependencies, null, 2)}

Database schema (if any):
${dbSchema && dbSchema.length ? JSON.stringify(dbSchema, null, 2) : "None"}

SQL queries found in code (if any):
${
  dbQueries && dbQueries.length
    ? dbQueries.map((q) => `- ${q}`).join("\n")
    : "None"
}

1. Propose a migration plan for this group, including how to refactor or group files/modules in the target language.
2. Suggest equivalent technology, library, or framework in the target language if needed (e.g., SQL → NoSQL, REST → GraphQL, PHP array config → Node.js JSON config).
3. If database is present, suggest a modern database solution (e.g., ORM, GraphQL, NoSQL, etc.) and how to migrate schema/queries.
4. Provide migration notes specific to converting from ${from} to ${to}.
Reply in JSON format, in English:
{
  "files": [...],
  "migrationPlan": "...",
  "suggestedTech": "...",
  "databaseSuggestion": "...",
  "note": "..."
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });
    const text = completion.choices[0].message.content;
    console.log(
      "\n--- AI response for group ---\n",
      text,
      "\n-----------------------------\n"
    );
    // Sửa lỗi escape ký tự trong JSON trả về từ OpenAI
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

async function analyzeGroupPromptWithRetry(group, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeGroupPrompt(group);
    } catch (err) {
      lastError = err;
      console.log(`Retry ${attempt}/${maxRetries} failed: ${err.message}`);
      await new Promise((res) => setTimeout(res, 1000 * attempt)); // backoff
    }
  }
  // Nếu vẫn fail, trả về lỗi cuối cùng
  return {
    files: group.files,
    migrationPlan: "error",
    suggestedTech: "",
    databaseSuggestion: "",
    note: `Failed after ${maxRetries} retries: ${lastError.message}`,
  };
}

// --- Export to PDF using pdfmake ---
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

// --- Connected components grouping ---
function buildAdjacencyList(dependencyGraph) {
  const adj = {};
  for (const node of dependencyGraph) {
    if (!adj[node.file]) adj[node.file] = new Set();
    for (const dep of node.dependencies) {
      // Only link if dependency is a file in the project
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
  // Add files without any dependencies (not in adj)
  const allFiles = new Set(dependencyGraph.map((d) => d.file));
  for (const file of allFiles) {
    if (!adj[file]) groups.push([file]);
  }
  return groups;
}

// --- Main flow ---
(async () => {
  console.log(`Scanning directory: ${sourceDir}`);
  const files = getAllFiles(sourceDir);
  console.log(
    `Found ${files.length} files. Analyzing dependencies and database...`
  );

  // Build dependency graph
  const dependencyGraph = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const lang = EXT_LANG_MAP[ext] || "unknown";
    if (lang === "unknown") continue;
    const deps = analyzeDependencies(file, lang);
    dependencyGraph.push({ file, type: lang, dependencies: deps });
  }

  // Detect SQL schema files and extract schema
  const sqlSchemaFiles = files.filter((f) => f.endsWith(".sql"));
  let dbSchema = [];
  for (const sqlFile of sqlSchemaFiles) {
    const content = fs.readFileSync(sqlFile, "utf-8");
    dbSchema = dbSchema.concat(extractSqlSchema(content));
  }

  // Find SQL queries in code
  let dbQueries = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if ([".php", ".js", ".ts", ".py", ".java", ".cs", ".rb"].includes(ext)) {
      const content = fs.readFileSync(file, "utf-8");
      dbQueries = dbQueries.concat(findSqlQueriesInCode(content));
    }
  }

  // Group files by connected components
  const groups = findConnectedComponents(dependencyGraph);
  const results = [];
  for (const groupFiles of groups) {
    // Lấy dependency subgraph cho group này
    const groupDeps = dependencyGraph.filter((d) =>
      groupFiles.includes(d.file)
    );
    // Lấy các truy vấn SQL liên quan (nếu có)
    const groupDbQueries = [];
    for (const f of groupFiles) {
      const ext = path.extname(f).toLowerCase();
      if ([".php", ".js", ".ts", ".py", ".java", ".cs", ".rb"].includes(ext)) {
        const content = fs.readFileSync(f, "utf-8");
        groupDbQueries.push(...findSqlQueriesInCode(content));
      }
    }
    // Gửi prompt cho AI cho từng group
    const group = {
      files: groupFiles,
      dependencies: groupDeps,
      dbSchema, // Có thể lọc schema liên quan nếu muốn
      dbQueries: groupDbQueries,
      from,
      to,
    };
    results.push(await analyzeGroupPromptWithRetry(group));
  }

  fs.writeFileSync(output, JSON.stringify(results, null, 2), "utf-8");
  console.log(`Migration map saved to ${output}`);

  if (pdf) {
    exportToPDF(results, pdf);
    console.log(`Migration map PDF exported to ${pdf}`);
  }
})();
