# ORVEXA PRIME DIGITAL — "Conhecimento que Transforma"

Plataforma SaaS Multi-IA corporativa de alto padrão com AI Gateway inteligente, balanceamento sem limites, failover transparente, roteamento semântico por intenção (ORVEXA PRIME ENGINE), Image Studio com Prompt Engine de 11 parâmetros, Document Analyzer (PDF/Excel), Site Builder (7 templates) e 5 Agentes Especialistas de Elite.

---

## 🚀 Arquitetura & Módulos Implementados

### 1. AI Gateway & Balanceador de Chaves (GATE 1, 2 e 3)
- **Zero Secrets no Frontend**: Chaves de API mantidas exclusivamente no backend criptografadas com **AES-256-GCM**, IV aleatório e Auth Tag.
- **Cadastro Ilimitado de APIs**: Suporte a Claude (Anthropic), GPT/Codex (OpenAI), Gemini (Google) e provedores compatíveis (Mirai API).
- **Rotação Automática a 90%**: Rebaixamento dinâmico de prioridade para proteger cotas mensais.
- **Bloqueio Automático a 100%**: Exclusão imediata de chaves sem saldo residual.
- **Roteamento Semântico (ORVEXA PRIME ENGINE)**: Detecção automática da intenção do usuário (`PROGRAMACAO`, `TEXTO_COPY`, `PESQUISA_PROFUNDA`, `DOCUMENTOS`).

### 2. ORVEXA Image Studio & Prompt Engine (GATE 4)
- **Prompt Engine (11 Parâmetros)**: Objetivo, Público, Estilo, Cenário, Iluminação, Composição, Cores, Câmera, Qualidade, Formato e Negative Prompt.
- **Canvas Visual Interativo**: Ajuste e inserção de etiquetas de preço em tempo real (ex: R$ 12,99) com download em PNG/SVG.
- **Multi-Formato**: 1:1 (Feed), 16:9 (Banner), 9:16 (Stories), 4:5 (Instagram).

### 3. Document Analyzer (GATE 4)
- Extração tabular e estruturada de **XLSX, XLS, CSV, PDF, DOCX e Imagens**.
- Cálculos financeiros automáticos (totalizadores de caixas, ticket médio) e auditoria de riscos legais.

### 4. ORVEXA Site Builder (GATE 5)
- Geração automática de sites responsivos completos para **7 segmentos comerciais**:
  1. `Loja`: E-commerce com catálogo e checkout via WhatsApp.
  2. `Clínica`: Consultórios e centros médicos com agendamento online.
  3. `Restaurante`: Gastronomia, cardápio digital por abas e reserva de mesas.
  4. `Igreja`: Programação de cultos, transmissões ao vivo e ministérios.
  5. `Advogado`: Advocacia premium e consulta confidencial.
  6. `Petshop`: Banho e tosa, cuidados veterinários e agendamento.
  7. `Landing Page`: Páginas de alta conversão para SaaS, infoprodutos e mentorias.
- Live Preview com alternador de dispositivos (🖥️ Desktop 100%, 📟 Tablet 768px, 📱 Mobile 375px), editor rápido e download em 1 clique (`index.html`).

### 5. Suíte dos 5 Agentes Especialistas (GATE 5)
- **`ORVEXA DEV`** (GPT-5.6 Sol / Codex) — Código limpo, Clean Architecture e suíte de testes unitários.
- **`ORVEXA DESIGN`** (Claude Sonnet 5) — UI/UX, Design Systems, paletas de cores harmônicas e contraste WCAG AAA.
- **`ORVEXA MARKETING`** (Claude Fable 5.1) — Copywriting AIDA, anúncios e funis de alta conversão.
- **`ORVEXA ESTUDOS`** (Gemini 3.8 Ultra) — Método Feynman, flashcards Anki e aprendizado acelerado.
- **`ORVEXA JURÍDICO`** (Claude Sonnet 5) — Diagnóstico de conformidade LGPD e minutas contratuais.

### 6. Pagamento, Segurança & Produção (GATE 6)
- **Fluxo Estrito de Pagamento**: Usuários iniciam com status `PENDING_PAYMENT` e só têm acesso ao AI Gateway liberado após confirmação do **Webhook financeiro** (PIX / Cartão).
- **Rate Limiting (Sliding Window)**: Proteção contra ataques de força bruta no login/registro e controle de cotas de IA.
- **Multi-tenant Rígido**: Isolamento criptográfico e por tenant em todas as consultas de dados.
- **Telemetria de Produção**: Endpoint `GET /api/health` monitorando integridade de banco de dados, uptime e memória.

---

## 🔑 Credenciais de Demonstração

| Perfil | E-mail | Senha | Acesso |
| :--- | :--- | :--- | :--- |
| **Administrador Master** | `admin@orvexa.digital` | `AdminOrvexa2026!` | Painel Executivo (`/admin`), Gestão de APIs (`/admin/api-keys`), Usuários e Regras |
| **Cliente Ativo** | `cliente@orvexa.digital` | `ClienteOrvexa2026!` | Portal do Cliente (`/dashboard`), Chat Multi-IA, Site Builder, Image Studio e Document Analyzer |

---

## 🛠️ Comandos de Execução e Testes

### Iniciar o Servidor de Desenvolvimento
```powershell
npm run dev
```
Acesse em: `http://localhost:3000`

### Gerar Build de Produção
```powershell
npm run build
npm run start
```

### Executar Suítes de Verificação Automatizada
```powershell
# Testes do GATE 5 (Site Builder, 7 templates e Agentes)
npx tsx scripts/test-gate5.js

# Testes do GATE 6 (Pagamento, Webhook, Rate Limit e Segurança)
npx tsx scripts/test-gate6.js

# Teste das Camadas Criptográficas (AES-256-GCM, Bcrypt e Intenções)
node test-verification.js
```
