/*
 * Checklist Generator Library
 * --------------------------
 * Thư viện sinh checklist/manual test case tự động bằng AI cho các project code.
 *
 * Sử dụng:
 *   const { generateChecklistAI } = require('./lib/checklist-generator');
 *   await generateChecklistAI({
 *     srcDir: 'path/to/source',
 *     resultDir: 'path/to/output',
 *     outputFile: 'checklist.xlsx',
 *     openaiApiKey: 'sk-xxx',
 *     language: 'vi' // hoặc 'en'
 *   });
 *
 * Hàm export:
 *   - generateChecklistAI: Hàm chính, sinh checklist và lưu file Excel.
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { OpenAI } = require("openai");

async function generateChecklistAI({
  srcDir,
  resultDir,
  outputFile,
  openaiApiKey,
  language = "vi",
}) {
  if (!openaiApiKey) throw new Error("Missing openaiApiKey");
  if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir, { recursive: true });
  const files = getAllFiles(srcDir);
  const openai = new OpenAI({ apiKey: openaiApiKey });

  // Gộp nội dung các file mã nguồn lại
  let allCode = "";
  let fileList = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (![".php", ".js", ".ts", ".py", ".java", ".cs", ".rb"].includes(ext))
      continue;
    const content = fs.readFileSync(file, "utf-8");
    allCode += `\n// File: ${path.relative(srcDir, file)}\n` + content + "\n";
    fileList.push(path.relative(srcDir, file));
  }
  if (!allCode)
    throw new Error("Không tìm thấy file mã nguồn hợp lệ trong thư mục.");

  // Prompt tổng hợp UI/integration
  const prompt = buildProjectPromptUI(allCode, fileList, language);
  let checklist = [];
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });
      const text = completion.choices[0].message.content;
      checklist = parseChecklist(text);
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (attempt < 3) {
        await new Promise((res) => setTimeout(res, 1000 * attempt)); // backoff
      }
    }
  }
  if (lastError) {
    checklist = [
      {
        description: "Lỗi khi sinh checklist bằng AI",
        steps: [lastError.message],
        expected: "",
        note: "",
      },
    ];
  }
  // Ghi file xlsx
  const wsData = [
    ["Test Case ID", "Mô tả", "Bước thực hiện", "Kết quả mong đợi", "Ghi chú"],
    ...checklist.map((tc, i) => [
      `TC-${(i + 1).toString().padStart(3, "0")}`,
      tc.description || "",
      formatStepsForExcel(tc.steps),
      tc.expected || "",
      tc.note || "",
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Checklist");
  const outPath = path.join(resultDir, outputFile);
  XLSX.writeFile(wb, outPath);
  return outPath;
}

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

function buildProjectPromptUI(allCode, fileList, language) {
  const fileListStr = fileList.map((f) => `- ${f}`).join("\n");
  if (language === "vi") {
    return `Bạn là chuyên gia kiểm thử phần mềm. Dưới đây là mã nguồn của một hệ thống. Hãy phân tích toàn bộ hệ thống này và sinh ra checklist/manual test case tổng hợp cho tester kiểm thử thủ công trên giao diện người dùng (UI/integration test).
- Mỗi test case chỉ gồm các bước là hành động của người dùng trên giao diện (ví dụ: mở trang, nhập dữ liệu, nhấn nút, kiểm tra kết quả hiển thị trên UI).
- Không sinh test case cho việc gọi hàm, gọi API trực tiếp, hoặc kiểm thử ở mức mã nguồn.
- Tập trung vào các chức năng, luồng nghiệp vụ chính, các điểm tích hợp (integration), không liệt kê test case cho từng file code.
- Mỗi test case gồm:
  + Mô tả
  + Các bước thực hiện (array, mỗi bước là một string, bắt đầu bằng số thứ tự: 1., 2., ...)
  + Kết quả mong đợi
  + Ghi chú
- Trả về kết quả ở dạng JSON array, mỗi phần tử có các trường: description, steps, expected, note.

Code:
${allCode}
`;
  } else {
    return `You are a software testing expert. Below is the source code of a system. Analyze the whole system and generate a comprehensive manual test checklist for a tester to perform manual testing on the user interface (UI/integration test).
- Each test case should only include steps that are user actions on the UI (e.g., open page, enter data, click button, verify result on UI).
- Do not generate test cases for calling functions, APIs, or source code level testing.
- Focus on business flows, main features, and integration points, not on individual code files.
- Each test case should include:
  + Description
  + Steps (array, each step is a string, starting with number: 1., 2., ...)
  + Expected Result
  + Note
- Return the result as a JSON array, each element has fields: description, steps, expected, note.

Code:
${allCode}
`;
  }
}

function parseChecklist(text) {
  // Tìm JSON array trong text trả về
  try {
    const match = text.match(/\[.*\]/s);
    if (match) {
      return JSON.parse(match[0]);
    }
    // Nếu trả về luôn là JSON
    return JSON.parse(text);
  } catch {
    // Nếu không parse được, trả về 1 test case lỗi
    return [
      {
        description: "Không parse được checklist từ AI",
        steps: [text],
        expected: "",
        note: "",
      },
    ];
  }
}

function formatStepsForExcel(steps) {
  if (Array.isArray(steps)) {
    return steps.join("\n");
  }
  if (typeof steps === "string") {
    // Tự động tách dòng theo "Bước 1:", "Bước 2:", "Step 1:", hoặc ký tự xuống dòng
    return steps
      .replace(/(Bước \d+:|Step \d+:)/g, "\n$1")
      .replace(/\r?\n/g, "\n");
  }
  return "";
}

module.exports = { generateChecklistAI };
