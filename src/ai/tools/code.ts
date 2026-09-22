// src/ai/tools/code.ts
// CODE AGENT: MOTOR DE GERAÇÃO DE PROJETOS E EMPACOTAMENTO ZIP — ORVEXA PRIME DIGITAL

import JSZip from "jszip";

export interface ProjectFileEntry {
  path: string;
  content: string;
}

export interface GeneratedProjectResult {
  projectName: string;
  zipFileName: string;
  zipBuffer: Buffer;
  filesList: string[];
  totalFiles: number;
}

/**
 * Cria a estrutura completa de um projeto de software e empacota em arquivo .zip
 */
export async function generateProjectZip(params: {
  projectName: string;
  projectType: "react" | "nextjs" | "node_api" | "fullstack" | "financeiro" | "custom";
  description?: string;
  customFiles?: ProjectFileEntry[];
}): Promise<GeneratedProjectResult> {
  const { projectName, projectType, description, customFiles } = params;
  const zip = new JSZip();

  const sanitizedProjectName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-") || "projeto-orvexa";

  const defaultFiles: ProjectFileEntry[] = [];

  // README.md padrão do projeto
  defaultFiles.push({
    path: "README.md",
    content: `# ${projectName.toUpperCase()}
> Gerado automaticamente por ORVEXA DEV (AI Code Agent) — ORVEXA PRIME DIGITAL

## 🚀 Sobre o Projeto
${description || "Sistema profissional desenvolvido com arquitetura modular, tipagem estrita e boas práticas de engenharia de software."}

## 📁 Estrutura de Pastas
\`\`\`
${sanitizedProjectName}/
├── src/
│   ├── index.ts
│   ├── routes/
│   └── services/
├── components/
│   └── ui/
├── database/
│   ├── schema.prisma
│   └── seed.ts
├── package.json
└── README.md
\`\`\`

## 🛠️ Como Executar
1. Instale as dependências:
   \`\`\`bash
   npm install
   \`\`\`
2. Inicie o servidor de desenvolvimento:
   \`\`\`bash
   npm run dev
   \`\`\`
`,
  });

  // package.json
  defaultFiles.push({
    path: "package.json",
    content: JSON.stringify(
      {
        name: sanitizedProjectName,
        version: "1.0.0",
        description: description || "Projeto gerado via ORVEXA DEV",
        main: "src/index.ts",
        scripts: {
          dev: "tsx watch src/index.ts",
          build: "tsc",
          start: "node dist/index.js",
          test: "vitest",
        },
        dependencies: {
          express: "^4.19.2",
          dotenv: "^16.4.5",
          zod: "^3.23.8",
        },
        devDependencies: {
          "@types/express": "^4.17.21",
          "@types/node": "^20.14.0",
          typescript: "^5.4.5",
          tsx: "^4.11.0",
          vitest: "^1.6.0",
        },
      },
      null,
      2
    ),
  });

  // tsconfig.json
  defaultFiles.push({
    path: "tsconfig.json",
    content: JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          outDir: "./dist",
        },
        include: ["src/**/*", "components/**/*", "database/**/*"],
      },
      null,
      2
    ),
  });

  // src/index.ts
  defaultFiles.push({
    path: "src/index.ts",
    content: `// src/index.ts
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`🚀 Servidor rodando em http://localhost:\${PORT}\`);
});
`,
  });

  // database/schema.prisma
  defaultFiles.push({
    path: "database/schema.prisma",
    content: `// database/schema.prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model Item {
  id        String   @id @default(uuid())
  title     String
  status    String   @default("ACTIVE")
  createdAt DateTime @default(now())
}
`,
  });

  // components/ui/Card.tsx
  defaultFiles.push({
    path: "components/ui/Card.tsx",
    content: `// components/ui/Card.tsx
import React from 'react';

export interface CardProps {
  title: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-lg">
      <h3 className="text-sm font-bold text-cyan-400 mb-2">{title}</h3>
      <div>{children}</div>
    </div>
  );
};
`,
  });

  const allFiles = [...defaultFiles, ...(customFiles || [])];
  const filesList: string[] = [];

  for (const file of allFiles) {
    zip.file(file.path, file.content);
    filesList.push(file.path);
  }

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });

  return {
    projectName: sanitizedProjectName,
    zipFileName: `${sanitizedProjectName}.zip`,
    zipBuffer,
    filesList,
    totalFiles: filesList.length,
  };
}
