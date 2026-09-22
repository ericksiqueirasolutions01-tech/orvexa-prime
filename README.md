# ORVEXA PRIME DIGITAL — "Conhecimento que Transforma"

> **Plataforma SaaS Multi-IA de Nível Internacional** com AI Gateway resiliente, Roteador Semântico Autônomo, IDE de Programação Codex, Memória Inteligente RAG (pgvector), 6 Agentes Especialistas de Elite, Controle de Consumo dos 5 Vetores, Faturamento Multigateway e Sistema Integrado de Backup & Disaster Recovery.

---

## 📑 Sumário

- [1. Visão Geral & Arquitetura](#1-visão-geral--arquitetura)
- [2. Pré-requisitos & Instalação](#2-pré-requisitos--instalação)
- [3. Configuração de Variáveis de Ambiente](#3-configuração-de-variáveis-de-ambiente)
- [4. Banco de Dados & Migrações](#4-banco-de-dados--migrações)
- [5. Módulos Centrais do ORVEXA PRIME](#5-módulos-centrais-do-orvexa-prime)
- [6. Agentes Especialistas Oficiais](#6-agentes-especialistas-oficiais)
- [7. Sistema de Planos & Controle de Consumo](#7-sistema-de-planos--controle-de-consumo)
- [8. Catálogo Completo de APIs](#8-catálogo-completo-de-apis)
- [9. Sistema Profissional de Backup & Restauração](#9-sistema-profissional-de-backup--restauração)
- [10. Diagnóstico, Testes & Manutenção](#10-diagnóstico-testes--manutenção)
- [11. Guia de Deploy em Produção](#11-guia-de-deploy-em-produção)
- [12. Credenciais Padrão de Demonstração](#12-credenciais-padrão-de-demonstração)

---

## 1. Visão Geral & Arquitetura

O **ORVEXA PRIME** foi concebido sob os princípios de **Clean Architecture**, **Domain-Driven Design (DDD)** e **Segurança Zero-Trust**. Ele atua como um hub centralizado que orquestra os principais provedores de Inteligência Artificial do mundo (**Anthropic Claude**, **OpenAI GPT/Codex** e **Google Gemini**) através de um Gateway unificado e balanceado.

### Diagrama de Arquitetura

```mermaid
flowchart TD
    Client["💻 Clientes (Web SaaS / Mobile PWA / APIs)"] --> Edge["🛡️ Edge Middleware (Auth JWT, Rate Limiting, CORS)"]
    
    subgraph CoreApp ["⚡ Camada de Aplicação (Next.js 14 App Router)"]
        Edge --> Router["App Router (Dashboard & Admin)"]
        Router --> Chat["💬 Multi-IA Chat"]
        Router --> Codex["💻 Codex Engine (IDE)"]
        Router --> Studio["🎨 Image Studio"]
        Router --> DocAnalyzer["📂 Document Analyzer"]
        Router --> SiteBuilder["🌐 Site Builder"]
        Router --> Billing["💳 Billing & Consumo"]
        Router --> AdminConsole["👑 Console Administrativo"]
    end

    subgraph ServiceLayer ["⚙️ Serviços & Motores Centrais"]
        AIGateway["AI Gateway (Failover & Load Balancing)"]
        MemoryEngine["Smart Memory Engine (Dense Vectors + RAG)"]
        ConsumptionEngine["Consumption Engine (5 Vetores)"]
        BackupEngine["Backup & Disaster Recovery (SHA-256)"]
        DiagnosticsEngine["Diagnostic Telemetry Engine"]
        PaymentService["Modular Payment Gateway (Stripe/MP/Asaas)"]
    end

    CoreApp --> ServiceLayer

    subgraph DataLayer ["🗄️ Camada de Persistência"]
        PrismaORM["Prisma ORM Client"]
        SQLiteDev[("SQLite (Ambiente Local/Dev)")]
        PostgresProd[("PostgreSQL + pgvector (Produção)")]
        DiskStorage[("Disco Seguro (storage/backups/)")]
    end

    ServiceLayer --> PrismaORM
    PrismaORM --> SQLiteDev
    PrismaORM --> PostgresProd
    BackupEngine --> DiskStorage

    subgraph ExternalAI ["🌐 Provedores de Inteligência Artificial"]
        Anthropic["Anthropic (Claude 3.5 Sonnet / Haiku)"]
        OpenAI["OpenAI (GPT-4o / GPT-4o Mini / Codex)"]
        Google["Google AI (Gemini 1.5 Pro / Flash)"]
    end

    AIGateway --> Anthropic
    AIGateway --> OpenAI
    AIGateway --> Google
```

---

## 2. Pré-requisitos & Instalação

### Pré-requisitos
- **Node.js**: Versão `>= 20.x` (LTS recomendado).
- **Gerenciador de Pacotes**: `npm` `>= 10.x` ou `yarn` / `pnpm`.
- **Sistema Operacional**: Windows 10/11, macOS ou Linux (Ubuntu 22.04+).
- **Banco de Dados**: SQLite embutido (desenvolvimento) ou PostgreSQL 15+ com extensão `vector` (produção).

### Instalação Passo a Passo

```bash
# 1. Clonar o repositório
git clone https://github.com/ericksiqueirasolutions01-tech/orvexa-prime.git

# 2. Acessar o diretório do projeto
cd orvexa-prime

# 3. Instalar as dependências
npm install

# 4. Configurar as variáveis de ambiente
cp .env.example .env

# 5. Sincronizar o banco de dados via Prisma
npm run prisma:push

# 6. Executar o seed inicial (cria planos, modelos, agentes e usuários padrão)
npm run prisma:seed

# 7. Iniciar o servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

---

## 3. Configuração de Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# ==============================================================================
# AMBIENTE & BANCO DE DADOS
# ==============================================================================
NODE_ENV=development
PORT=3000
DATABASE_URL="file:./dev.db"
# Para produção (PostgreSQL):
# DATABASE_URL="postgresql://orvexa_user:senha_forte@localhost:5432/orvexa_prime?schema=public"

# ==============================================================================
# SEGURANÇA & CRIPTOGRAFIA (Zero Secrets no Frontend)
# ==============================================================================
JWT_SECRET="orvexa-prime-jwt-secret-key-production-ready-2026-very-secure-min-32-chars"
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" # Chave hex 256 bits

# ==============================================================================
# PROVEDORES DE IA (As chaves podem ser configuradas no painel /admin/api-keys)
# ==============================================================================
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
GOOGLE_AI_KEY=""

# ==============================================================================
# GATEWAYS DE PAGAMENTO & WEBHOOKS
# ==============================================================================
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
MERCADO_PAGO_ACCESS_TOKEN="TEST-..."
ASAAS_API_KEY="$aact_..."

# ==============================================================================
# ARMAZENAMENTO & BACKUP
# ==============================================================================
BACKUP_STORAGE_DIR="./storage/backups"
MAX_BACKUP_RETENTION=15
```

---

## 4. Banco de Dados & Migrações

O ORVEXA PRIME utiliza o **Prisma ORM**, permitindo transição sem atrito entre SQLite (ambiente local de testes) e PostgreSQL com `pgvector` (ambiente de alta escala).

### Comandos Essenciais

```bash
# Sincroniza o schema diretamente no banco
npm run prisma:push

# Regenera o Prisma Client TypeScript
npm run prisma:generate

# Popula o banco com modelos, agentes, planos e credenciais
npm run prisma:seed

# Abre o visualizador gráfico do banco (Prisma Studio)
npx prisma studio
```

### Entidades do Modelo de Dados (`schema.prisma`):
- `User`: Cadastro de usuários, perfis, RBAC (`USER`, `ADMIN`), plano vinculado e status.
- `Plan`: Planos comerciais (`FREE`, `PRO`, `BUSINESS`, `ENTERPRISE`), preços e quotas dos 5 vetores.
- `Subscription`: Controle de recorrência mensal, períodos de vigência e gateway provedor.
- `Payment`: Registro de transações financeiras, recibos e auditoria de faturamento.
- `AiProvider` & `AiModel`: Provedores cadastrados e catálogo dinâmico de modelos de IA.
- `ApiKey`: Vault seguro de chaves de API criptografadas com **AES-256-GCM**.
- `Agent` & `AgentMemory`: Hub dos 6 agentes oficiais e suas memórias semânticas persistentes.
- `Conversation` & `Message`: Histórico de chats multi-IA com telemetria de tokens e latência.
- `File` & `FileKnowledge`: Repositório de arquivos do workspace e blocos RAG indexados.
- `UserMemory` & `ConversationMemory`: Memória de longo prazo do usuário e resumos contextuais.
- `GeneratedImage`: Histórico de criações visuais do Image Studio.
- `Project`: Projetos de código do Codex Engine e templates do Site Builder.
- `AuditLog`: Log de segurança imutável para eventos críticos do sistema.

---

## 5. Módulos Centrais do ORVEXA PRIME

### 🧠 1. AI Gateway Multi-IA & Balanceador Inteligente
- **Criptografia AES-256-GCM:** Nenhuma chave de API fica exposta no frontend.
- **Failover Transparente:** Se um provedor apresentar indisponibilidade (HTTP 429 ou 5xx), a requisição é redirecionada automaticamente para um provedor secundário em milissegundos.
- **Rotação Preventiva de Chaves:** Monitoramento dinâmico de consumo que rebaixa chaves a 90% da cota e desativa chaves esgotadas.
- **Roteamento Semântico de Intenção:** Detecta automaticamente se o usuário precisa de código, copy comercial, pesquisa profunda ou análise documental, direcionando para o melhor modelo.

### 💻 2. ORVEXA CODEX ENGINE (Ambiente de Programação Profissional)
- **Criação e Gestão de Projetos:** Criação de diretórios estruturados com árvore de arquivos interativa.
- **Editor Profissional com Destaque de Sintaxe:** Suporte nativo a JavaScript, TypeScript, Python, HTML, CSS, SQL e C#.
- **Autofix & Correção Automática:** Diagnóstico e correção assistida de bugs e erros de sintaxe em tempo real.
- **Explicação de Código:** Breakdown didático de funções complexas, complexidade assintótica (Big-O) e lógica algorítmica.
- **Auditoria de Segurança:** Varredura estática de vulnerabilidades (SQL Injection, XSS, hardcoded secrets e dependências inseguras).
- **Exportação para ZIP:** Compactação do projeto inteiro em um clique para download imediato.
- **Sandbox de Execução Segura:** Avaliação isolada de código com limites de tempo e recursos.

### 🧬 3. Smart Memory Engine & Busca Semântica RAG
- **Memória de Longo Prazo do Usuário:** Armazenamento de preferências, regras de negócio e stack técnica em `UserMemory`.
- **Memória Conversacional:** Resumos semânticos contínuos de conversas antigas.
- **Indexador RAG de Arquivos:** Fatiamento semântico com overlap (`chunkTextSemantically`) e vetorização densa de 384 dimensões.
- **Compatibilidade PostgreSQL + pgvector:** Preparado para busca de vizinhos mais próximos (HNSW/IVFFlat).
- **Controle Total de Privacidade:** Interface para visualizar, pesquisar, editar e apagar memórias.

### 🎨 4. ORVEXA Image Studio
- **Prompt Engine Profissional:** Otimização automática de prompts considerando estilo, iluminação, composição, câmera e negative prompts.
- **Formatos Suportados:** 1:1 (Quadrado), 16:9 (Widescreen), 9:16 (Stories/Reels) e 4:5 (Feed).

### 📂 5. Document Analyzer
- **Extração Tabular & Semântica:** Processamento de PDF, DOCX, XLSX, CSV e Imagens.
- **Auditoria Financeira & Jurídica:** Cálculo automático de métricas, balanços e diagnóstico de conformidade.

### 🌐 6. Site Builder Comercial
- **Geração Completa para 7 Segmentos:** Loja Virtual, Clínica Médica, Restaurante, Igreja, Escritório de Advocacia, Petshop e Landing Page.
- **Live Preview Responsivo:** Alternância instantânea entre Desktop, Tablet e Celular com download de `index.html`.

---

## 6. Agentes Especialistas Oficiais

O ORVEXA PRIME conta com **6 Agentes Especialistas de Elite**, cada um calibrado com prompts comportamentais rigorosos e conjunto próprio de ferramentas autônomas:

| Agente | Slug | Foco de Atuação | Modelo Padrão | Ferramentas Autônomas |
| :--- | :--- | :--- | :--- | :--- |
| **ORVEXA DEV** | `orvexa-dev` | Arquitetura de Software & Full Stack | Claude 3.5 Sonnet | Análise AST, Lint, Scaffold, Security Review |
| **ORVEXA DESIGN** | `orvexa-design` | UI/UX & Design Systems | Claude 3.5 Sonnet | Paletas WCAG, Tipografia, Componentes Tailwind |
| **ORVEXA MARKETING** | `orvexa-marketing` | Growth, Copywriting & Funis | Claude 3.5 Sonnet | Modelos AIDA, Otimização de CTR, Estratégia SEO |
| **ORVEXA EDU** | `orvexa-edu` | Pedagogia & Aprendizado Acelerado | GPT-4o | Método Feynman, Quiz Gerador, Flashcards Anki |
| **ORVEXA BUSINESS** | `orvexa-business` | Estratégia, Finanças & Contratos | Claude 3.5 Sonnet | Análise DRE, Modelagem SaaS, Auditoria LGPD |
| **ORVEXA ANALYST** | `orvexa-analyst` | Data Science, Métricas & SQL | Gemini 1.5 Pro | Queries SQL, Estatística Descritiva, Gráficos |

---

## 7. Sistema de Planos & Controle de Consumo

O sistema comercial do ORVEXA PRIME controla o consumo em tempo real sobre **5 vetores de recursos independentes**:

```mermaid
graph LR
    Plan["Plano Ativo"] --> M1["1. Quantidade de Mensagens"]
    Plan --> M2["2. Arquivos Processados (RAG)"]
    Plan --> M3["3. Geração de Imagens"]
    Plan --> M4["4. Uso de Agentes Especialistas"]
    Plan --> M5["5. Limite de Armazenamento"]
```

### Grade Comparativa dos 4 Planos

| Recurso | FREE | PRO | BUSINESS | ENTERPRISE |
| :--- | :--- | :--- | :--- | :--- |
| **Preço Mensal** | **R$ 0,00** | **R$ 79,90** | **R$ 249,90** | **R$ 799,90** |
| 💬 **Mensagens / Mês** | 100 msgs | 1.500 msgs | 6.000 msgs | 50.000 msgs (Ilimitado) |
| 📂 **Arquivos Processados** | 5 arquivos | 60 arquivos | 300 arquivos | 2.000 arquivos |
| 🎨 **Geração de Imagens** | 10 imagens | 80 imagens | 300 imagens | 1.500 imagens |
| 🤖 **Acesso a Agentes** | 1 Agente (`orvexa-dev`) | Todos os 6 Agentes | 6 Agentes + Custom | Agentes VIP Dedicados |
| 💾 **Armazenamento** | 100 MB | 5 GB | 25 GB | 100 GB |
| ⚡ **Modelos de IA** | Rápidos (Mini / Flash) | Top-Tier (Sonnet & GPT-4o) | Top-Tier + Router VIP | Chaves Dedicadas + SLA |

### Enforcement em Tempo Real
Os guards em tempo real (`src/lib/consumption.ts`) validam as cotas antes do processamento de mensagens, uploads ou imagens. Usuários com 80% do limite recebem avisos visuais amarelos no Dashboard, e contas no limite de 100% recebem `HTTP 403 Forbidden` com link amigável para upgrade de plano.

---

## 8. Catálogo Completo de APIs

### Autenticação & Perfil
- `POST /api/auth/login`: Autenticação com e-mail/senha, emissão de JWT HttpOnly.
- `POST /api/auth/register`: Cadastro de usuário com plano FREE padrão.
- `GET /api/auth/me`: Retorna a sessão ativa, perfil e plano vinculado.
- `POST /api/auth/logout`: Revogação da sessão e expurgo do cookie JWT.

### IA & Chat
- `POST /api/ai/chat`: Envio de mensagens com suporte a streaming, seleção de agente e memória RAG.
- `GET /api/ai/agents`: Lista todos os agentes especialistas cadastrados.
- `GET /api/ai/agents/[id]/memory`: Consulta a memória de longo prazo associada ao agente.
- `POST /api/ai/image-studio`: Geração de imagens via prompt com parâmetros avançados.

### Codex Engine
- `GET /api/ai/codex/projects`: Lista projetos de programação do usuário.
- `POST /api/ai/codex/projects`: Criação de novo projeto de código.
- `POST /api/ai/codex/autofix`: Correção automática de erros de código.
- `POST /api/ai/codex/explain`: Explicação didática de blocos de código.
- `POST /api/ai/codex/review`: Revisão de segurança e boas práticas.
- `POST /api/ai/codex/export`: Compactação e download do projeto em arquivo ZIP.

### Workspace & Documentos
- `POST /api/workspace/upload`: Upload multipart/form-data com validação de storage e indexação RAG.
- `GET /api/workspace/files`: Lista arquivos armazenados no workspace.
- `GET /api/workspace/files/[id]/download`: Download de arquivo original ou reconstruído.

### Faturamento & Pagamentos
- `GET /api/user/consumption`: Resumo dos 5 vetores de consumo, datas do ciclo e histórico.
- `POST /api/billing/checkout`: Inicia sessão de checkout (Pix com QR Code ou Cartão).
- `POST /api/billing/upgrade`: Realiza a transição imediata de plano.
- `POST /api/webhooks/payment`: Webhook financeiro oficial com validação HMAC SHA-256 e idempotência.

### Administração & Backup
- `GET /api/admin/system/diagnostics`: Relatório completo de saúde do sistema e APIs.
- `GET /api/admin/backup`: Lista catálogo de snapshots e histórico de versões.
- `POST /api/admin/backup`: Criação sob demanda de novo backup (`FULL`, `DATABASE`, `FILES`).
- `POST /api/admin/backup/[id]/restore`: Restauração do sistema com snapshot preventivo automático.
- `GET /api/admin/backup/[id]/download`: Download do arquivo `.zip` para armazenamento offsite.
- `DELETE /api/admin/backup/[id]`: Exclusão de versão do histórico.

---

## 9. Sistema Profissional de Backup & Restauração

O motor de backup (`src/lib/backup.ts`) opera com isolamento atômico:

1. **Criação:** Compacta todas as 17 entidades relacionais em `database/dump.json`, inclui cópia binária do banco de dados e empacota os arquivos de workspace em pasta dedicada no `.zip`.
2. **Integridade SHA-256:** Um hash criptográfico é gerado no momento do empacotamento e salvo em `storage/backups/manifest.json`.
3. **Restauração Protegida:** Antes de restaurar qualquer dado, um **snapshot preventivo de segurança** é criado automaticamente. Na sequência, os dados são reinseridos respeitando chaves estrangeiras.
4. **Retenção Rotativa:** Mantém até 15 versões, purgando os arquivos mais antigos automaticamente para otimizar espaço em disco.

---

## 10. Diagnóstico, Testes & Manutenção

O ORVEXA PRIME inclui uma suíte completa de testes automatizados com cobertura E2E para todos os módulos:

```bash
# Executa a bateria completa de testes de diagnóstico do sistema
npm run test:system

# Executa testes específicos do motor de planos e consumo
node scripts/test-plans-and-consumption-e2e.js

# Executa testes do sistema de backup e restauração
node scripts/test-backup-system-e2e.js

# Executa testes dos agentes e ferramentas autônomas
node scripts/test-agents-architecture-e2e.js

# Executa testes do motor de memória inteligente e busca semântica
node scripts/test-smart-memory-e2e.js

# Executa testes de prontidão para produção (Rate limit, PII, Logger, Cache)
node scripts/test-production-readiness-e2e.js
```

### Checagem de Tipos e Build de Produção

```bash
# Verificação rigorosa do TypeScript (0 erros tolerados)
npx tsc --noEmit

# Compilação completa para produção
npm run build
```

---

## 11. Guia de Deploy em Produção

### Opção A: Deploy na Vercel / Railway
1. Conecte o repositório GitHub à plataforma.
2. Defina o comando de build como `npm run build`.
3. Configure as variáveis de ambiente (`DATABASE_URL`, `JWT_SECRET`, etc.).
4. Adicione um banco PostgreSQL com suporte a extensão `pgvector`.
5. Execute `npx prisma db push` e `node prisma/seed.js` no deploy hook.

### Opção B: Deploy em VPS Linux (Ubuntu / Nginx / PM2)

```bash
# 1. Atualizar o sistema e instalar dependências
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm nginx git

# 2. Instalar o gerenciador de processos PM2
sudo npm install -g pm2

# 3. Clonar e compilar a aplicação
git clone https://github.com/ericksiqueirasolutions01-tech/orvexa-prime.git /var/www/orvexa-prime
cd /var/www/orvexa-prime
npm install
npm run build

# 4. Iniciar com PM2
pm2 start npm --name "orvexa-prime" -- start
pm2 save
pm2 startup

# 5. Configurar o Nginx como Proxy Reverso com SSL Certbot
# Apontar proxy_pass para http://127.0.0.1:3000
```

---

## 12. Credenciais Padrão de Demonstração

Para fins de auditoria, testes de aceitação e homologação rápida:

| Perfil | E-mail | Senha Padrão | Escopo de Acesso |
| :--- | :--- | :--- | :--- |
| **Administrador Master** | `admin@orvexa.digital` | `AdminOrvexa2026!` | Acesso total ao painel `/admin`, Gestão de APIs, Usuários, Regras, Diagnóstico e Backups |
| **Cliente Ativo (Plano PRO)** | `cliente@orvexa.digital` | `ClienteOrvexa2026!` | Acesso completo ao `/dashboard`, Chat Multi-IA, Codex Engine, Image Studio, Workspace e Billing |

---

<p align="center">
  <strong>ORVEXA PRIME SAAS © 2026 — Todos os direitos reservados.</strong><br/>
  <em>Construído com tecnologia de ponta para empresas que exigem excelência em Inteligência Artificial.</em>
</p>
