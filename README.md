# AI Migration Map & Checklist

## Overview

**AI Migration Map & Checklist** is a web-based tool that supports:

- Analyzing and planning migrations between different programming languages (PHP, Node.js, Java, Python, C#, Ruby, etc.)
- Generating automated test checklists using AI (OpenAI GPT-3.5/4)
- Reviewing migration results and checklists directly on the web (PDF viewer)

## Key Features

- Automatic dependency graph analysis, module grouping, SQL schema/query detection
- Modern technology recommendations for target languages (ORM, GraphQL, NoSQL, etc.)
- Automated UI/integration test checklist generation with .xlsx and .pdf export
- Modern web interface with direct PDF viewing capability

## Setup & Usage

### 1. Install dependencies

```bash
npm install
```

### 2. Set OpenAI API Key (optional - can be set in frontend)

```bash
# PowerShell
$env:OPENAI_API_KEY="your_openai_api_key"

# CMD
set OPENAI_API_KEY=your_openai_api_key
```

### 3. Run the application

```bash
npm start
# or
node migration-map-server.js
```

Default: http://localhost:3000

### 4. Use the web interface

- **Home Page** (`/`): Overview and navigation
- **Migration Map** (`/migration_map`): Generate migration plans between languages
- **QA Test Checklist** (`/qa_test`): Generate automated test checklists

## Features

- **Migration Map**: Analyzes source code, generates migration plans, and exports to JSON/PDF
- **QA Test Checklist**: Creates comprehensive test checklists with AI assistance
- **Modern UI**: 100% English interface with responsive design
- **State Persistence**: Form inputs and results are saved in browser localStorage
- **Direct PDF Viewing**: Review results without downloading files

## Migration Workflow

### Home Page

Access [http://localhost:3000/](http://localhost:3000/)

Choose:

- **Migration Map** (`/migration_map`)
- **QA Test Checklist** (`/qa_test`)

### Migration Map (`/migration_map`)

- Enter source code path (on server, e.g., `example/src`)
- Select source and target languages
- Set output file names for JSON and PDF (can keep defaults)
- Click **Set API Key** to enter OpenAI API key (saved in browser)
- Click **Generate Migration Map**
- After completion:
  - **Download JSON** or **Download PDF**
  - Click **View PDF** to review migration plan directly on web (PDF opens in modal)

### QA Test Checklist (`/qa_test`)

- Enter source code path (on server, e.g., `example/src`)
- Set output file name (default: `manual-checklist.xlsx`)
- Checkbox "Generate PDF checklist" is pre-ticked
- Click **Set API Key** to enter OpenAI API key (saved in browser)
- Click **Generate Checklist**
- After completion:
  - **Download Checklist (.xlsx)** or **Download PDF**
  - Click **View PDF** to review checklist directly on web (PDF opens in modal)

## Project Structure

```
invictus-ai/
├── public/                    # Web interface files
│   ├── index.html            # Home page
│   ├── migration_map.html    # Migration map interface
│   └── qa_test.html          # QA test interface
├── fonts/                    # Font files for PDF generation
│   ├── Roboto-Bold.ttf      # Bold font
│   └── Roboto-Regular.ttf   # Regular font
├── example/                  # Example projects (excluded from main structure)
├── migration-map-server.js   # Express.js backend server
├── migration-map.js          # Core migration logic
├── dependency-graph.js       # Dependency analysis utilities
├── package.json              # Node.js dependencies
├── package-lock.json         # Locked dependencies
├── checklist-ai-gen-1.0.0.tgz # AI checklist generation package
└── README.md                 # This file
```

## Output Examples

### Migration Map Results

- **JSON**: Detailed migration plan, dependencies, technology suggestions (for automation/development)
- **PDF**: Clear presentation of file/module groups, migration plans, test checklists (for review and presentation)

### Example Results (PDF/JSON)

| Files                                            | Migration Plan                                                       | Suggested Tech        | Database Suggestion    | Note                                 |
| ------------------------------------------------ | -------------------------------------------------------------------- | --------------------- | ---------------------- | ------------------------------------ |
| UserController.php, PaymentService.php, User.php | Refactor into Node.js modules, use Sequelize ORM, convert SQL to ORM | Sequelize, ES6 module | PostgreSQL/MySQL + ORM | Note async/await, syntax differences |
| config.php                                       | Convert to JSON config, use 'config' package                         | config (Node.js)      | ORM for DB             | Note configuration differences       |
| schema.sql                                       | Convert schema to ORM models                                         | Sequelize/Knex.js     | PostgreSQL/MySQL       | Note type mapping                    |

## Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **AI**: OpenAI GPT-3.5/4 API
- **File Processing**: Multer, PDF generation

## Dependencies

- **express**: Web server framework
- **openai**: OpenAI API client
- **pdfmake**: PDF generation library
- **body-parser**: Request body parsing
- **commander**: CLI argument parsing
- **checklist-ai-gen**: AI-powered checklist generation

## Contributing

- Report issues or suggest improvements by creating issues on the repository
- For feature requests or language support extensions, please contact the maintainers
- All contributions are welcome!

## Notes

- Source code paths should be relative to the server running the Node.js application
- API keys are stored securely in the browser (localStorage)
- For large codebases, consider breaking them into smaller chunks for better AI processing
- Install missing packages using `npm install <package-name>` if needed

---

> **Note**: Screenshots should be placed in the `docs/` directory. If not available, take screenshots of the interface and save them as `docs/screenshot-home.png`, `docs/screenshot-migration-map.png`, and `docs/screenshot-qa-test.png` for optimal README display.
