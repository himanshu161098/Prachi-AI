import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config';

// Ensure data directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Password hashing utility using Node's standard crypto (OWASP approved scrypt)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    const [salt, key] = hash.split(':');
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derivedKey, 'hex'));
  } catch {
    return false;
  }
}

// Portable Embedded SQL Engine with ACID file persistence
class EmbeddedDatabase {
  private dataFile: string;
  private tables: Map<string, Map<string, Record<string, any>>> = new Map();

  constructor(filePath: string) {
    this.dataFile = filePath.endsWith('.json') ? filePath : `${filePath}.json`;
    this.loadFromDisk();
  }

  pragma(directive: string) {
    // No-op for compatibility
  }

  exec(sqlScript: string) {
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      if (stmt.toUpperCase().startsWith('CREATE TABLE')) {
        const match = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
        if (match && match[1]) {
          const tableName = match[1].toLowerCase();
          if (!this.tables.has(tableName)) {
            this.tables.set(tableName, new Map());
          }
        }
      }
    }
    this.persistToDisk();
  }

  prepare(sql: string) {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    return {
      run: (...params: any[]) => this.executeRun(trimmed, upper, params),
      get: (...params: any[]) => this.executeGet(trimmed, upper, params),
      all: (...params: any[]) => this.executeAll(trimmed, upper, params),
    };
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const raw = fs.readFileSync(this.dataFile, 'utf8');
        const parsed = JSON.parse(raw);
        for (const [table, rows] of Object.entries(parsed)) {
          const rowMap = new Map<string, Record<string, any>>();
          for (const [id, row] of Object.entries(rows as Record<string, any>)) {
            rowMap.set(id, row);
          }
          this.tables.set(table.toLowerCase(), rowMap);
        }
      }
    } catch (e) {
      console.error('[DB] Error loading database from disk, starting clean:', e);
    }
  }

  private persistToDisk() {
    try {
      const output: Record<string, Record<string, any>> = {};
      for (const [table, rows] of this.tables.entries()) {
        output[table] = {};
        for (const [id, row] of rows.entries()) {
          output[table][id] = row;
        }
      }
      const tmpFile = `${this.dataFile}.tmp.${process.pid}`;
      fs.writeFileSync(tmpFile, JSON.stringify(output, null, 2), 'utf8');
      try {
        fs.renameSync(tmpFile, this.dataFile);
      } catch {
        // If rename fails across filesystems or due to file lock on Windows, fall back to writeFileSync
        fs.writeFileSync(this.dataFile, JSON.stringify(output, null, 2), 'utf8');
        try { fs.unlinkSync(tmpFile); } catch {}
      }
    } catch (e) {
      console.error('[DB] Failed to persist database to disk:', e);
    }
  }

  private executeRun(sql: string, upper: string, params: any[]) {
    // 1. INSERT INTO <table> (...) VALUES (...)
    if (upper.startsWith('INSERT')) {
      const match = sql.match(/INSERT(?:\s+OR\s+IGNORE)?\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (match) {
        const table = match[1].toLowerCase();
        const cols = match[2].split(',').map(c => c.trim().toLowerCase());
        
        if (!this.tables.has(table)) {
          this.tables.set(table, new Map());
        }
        const rowMap = this.tables.get(table)!;

        const row: Record<string, any> = {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const valTokens = match[3].split(',').map(s => s.trim());
        let paramIdx = 0;
        for (let i = 0; i < cols.length; i++) {
          const token = valTokens[i] || '?';
          if (token === '?') {
            row[cols[i]] = params[paramIdx] !== undefined ? params[paramIdx] : null;
            paramIdx++;
          } else if (token.startsWith("'") && token.endsWith("'")) {
            row[cols[i]] = token.slice(1, -1);
          } else if (!isNaN(Number(token)) && token !== '') {
            row[cols[i]] = Number(token);
          } else if (token.toUpperCase() === 'NULL') {
            row[cols[i]] = null;
          } else {
            row[cols[i]] = params[paramIdx] !== undefined ? params[paramIdx] : token;
            paramIdx++;
          }
        }

        const id = row.id || (row.key ? row.key : `id-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
        row.id = id;

        // If INSERT OR IGNORE and exists, skip
        if (upper.includes('IGNORE') && rowMap.has(id)) {
          return { changes: 0, lastInsertRowid: id };
        }

        rowMap.set(String(id), row);
        this.persistToDisk();
        return { changes: 1, lastInsertRowid: id };
      }
    }

    // 2. UPDATE <table> SET ... WHERE ...
    if (upper.startsWith('UPDATE')) {
      const match = sql.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
      if (match) {
        const table = match[1].toLowerCase();
        const setClause = match[2];
        const whereClause = match[3];

        const rowMap = this.tables.get(table);
        if (!rowMap) return { changes: 0 };

        let changes = 0;
        let paramIdx = 0;

        // Extract assignments
        const assignments = setClause.split(',').map(s => s.trim());
        const setOperations: Array<{ col: string; isCoalesce: boolean; isCurrentTimestamp: boolean }> = [];

        for (const assign of assignments) {
          const parts = assign.split('=');
          const col = parts[0].trim().toLowerCase();
          const expr = parts[1].trim();
          const isCoalesce = expr.toUpperCase().startsWith('COALESCE');
          const isCurrentTimestamp = expr.toUpperCase().includes('CURRENT_TIMESTAMP');
          setOperations.push({ col, isCoalesce, isCurrentTimestamp });
        }

        for (const [id, row] of rowMap.entries()) {
          if (this.matchesWhere(row, whereClause, params.slice(setOperations.filter(s => !s.isCurrentTimestamp).length))) {
            let pIdx = 0;
            for (const op of setOperations) {
              if (op.isCurrentTimestamp) {
                row[op.col] = new Date().toISOString();
              } else {
                const val = params[pIdx++];
                if (op.isCoalesce) {
                  if (val !== null && val !== undefined) {
                    row[op.col] = val;
                  }
                } else {
                  row[op.col] = val;
                }
              }
            }
            row.updated_at = new Date().toISOString();
            changes++;
          }
        }

        if (changes > 0) this.persistToDisk();
        return { changes };
      }
    }

    // 3. DELETE FROM <table> WHERE ...
    if (upper.startsWith('DELETE')) {
      const match = sql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)\s*(?:WHERE\s+(.+))?/i);
      if (match) {
        const table = match[1].toLowerCase();
        const whereClause = match[2];
        const rowMap = this.tables.get(table);
        if (!rowMap) return { changes: 0 };

        let changes = 0;
        if (!whereClause) {
          changes = rowMap.size;
          rowMap.clear();
        } else {
          for (const [id, row] of Array.from(rowMap.entries())) {
            if (this.matchesWhere(row, whereClause, params)) {
              rowMap.delete(id);
              changes++;
            }
          }
        }

        if (changes > 0) this.persistToDisk();
        return { changes };
      }
    }

    return { changes: 0 };
  }

  private executeGet(sql: string, upper: string, params: any[]): Record<string, any> | undefined {
    const all = this.executeAll(sql, upper, params);
    return all.length > 0 ? all[0] : undefined;
  }

  private executeAll(sql: string, upper: string, params: any[]): Array<Record<string, any>> {
    // Count queries: SELECT count(*) as count FROM <table>
    const countMatch = sql.match(/SELECT\s+count\(\*\)\s+as\s+([a-zA-Z0-9_]+)\s+FROM\s+([a-zA-Z0-9_]+)/i);
    if (countMatch) {
      const colName = countMatch[1];
      const table = countMatch[2].toLowerCase();
      const rowMap = this.tables.get(table);
      const count = rowMap ? rowMap.size : 0;
      return [{ [colName]: count }];
    }

    // Table extraction
    const tableMatch = sql.match(/\bFROM\s+([a-zA-Z0-9_]+)\b/i);
    if (!tableMatch) return [];

    const table = tableMatch[1].toLowerCase();
    const rowMap = this.tables.get(table);
    if (!rowMap) return [];

    let results = Array.from(rowMap.values());

    // Where filtering
    const fromIdx = sql.indexOf(tableMatch[0]);
    const afterFrom = fromIdx !== -1 ? sql.slice(fromIdx + tableMatch[0].length) : sql;

    let whereClause = '';
    const whereIdx = afterFrom.search(/\bWHERE\b/i);
    if (whereIdx !== -1) {
      const rest = afterFrom.slice(whereIdx + 5).trim();
      const orderIdx = rest.search(/\bORDER\s+BY\b/i);
      const limitIdx = rest.search(/\bLIMIT\b/i);
      let cutIdx = rest.length;
      if (orderIdx !== -1) cutIdx = Math.min(cutIdx, orderIdx);
      if (limitIdx !== -1) cutIdx = Math.min(cutIdx, limitIdx);
      whereClause = rest.slice(0, cutIdx).trim();
    }

    if (whereClause) {
      results = results.filter(row => this.matchesWhere(row, whereClause, params));
    }

    // Order By
    let orderExpr = '';
    const orderIdx = afterFrom.search(/\bORDER\s+BY\b/i);
    if (orderIdx !== -1) {
      const rest = afterFrom.slice(orderIdx + 8).trim();
      const limitIdx = rest.search(/\bLIMIT\b/i);
      const cutIdx = limitIdx !== -1 ? limitIdx : rest.length;
      orderExpr = rest.slice(0, cutIdx).trim();
    }

    if (orderExpr) {
      const isDesc = orderExpr.toUpperCase().includes('DESC');
      const isPriorityCase = orderExpr.toUpperCase().includes('CASE PRIORITY');

      if (isPriorityCase) {
        const orderMap: Record<string, number> = { high: 1, medium: 2, low: 3 };
        results.sort((a, b) => (orderMap[a.priority] || 4) - (orderMap[b.priority] || 4));
      } else {
        const col = orderExpr.split(/\s+/)[0].replace(/^[a-zA-Z0-9_]+\./, '').toLowerCase();
        results.sort((a, b) => {
          const valA = a[col] ?? '';
          const valB = b[col] ?? '';
          if (valA < valB) return isDesc ? 1 : -1;
          if (valA > valB) return isDesc ? -1 : 1;
          return 0;
        });
      }
    }

    // Limit and Offset
    const limitMatch = sql.match(/LIMIT\s+(\?|[0-9]+)(?:\s+OFFSET\s+(\?|[0-9]+))?/i);
    if (limitMatch) {
      let limit = 50;
      let offset = 0;

      if (limitMatch[1] === '?') {
        limit = params[params.length - (limitMatch[2] ? 2 : 1)];
      } else {
        limit = parseInt(limitMatch[1], 10);
      }

      if (limitMatch[2]) {
        if (limitMatch[2] === '?') {
          offset = params[params.length - 1];
        } else {
          offset = parseInt(limitMatch[2], 10);
        }
      }

      results = results.slice(offset, offset + limit);
    }

    // Populate subquery columns if present (e.g. chunk_count or last_message)
    if (table === 'documents' && sql.includes('count(*) FROM document_chunks')) {
      const chunkMap = this.tables.get('document_chunks');
      for (const r of results) {
        let count = 0;
        if (chunkMap) {
          for (const chk of chunkMap.values()) {
            if (chk.document_id === r.id) count++;
          }
        }
        r.chunk_count = count;
      }
    }

    if (table === 'conversations') {
      const msgMap = this.tables.get('messages');
      for (const r of results) {
        let count = 0;
        let lastMsg = '';
        if (msgMap) {
          const convMsgs = Array.from(msgMap.values()).filter(m => m.conversation_id === r.id);
          count = convMsgs.length;
          if (convMsgs.length > 0) {
            convMsgs.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
            lastMsg = convMsgs[0].content;
          }
        }
        r.message_count = count;
        r.last_message = lastMsg;
      }
    }

    return results;
  }

  private matchesWhere(row: Record<string, any>, whereClause: string, params: any[]): boolean {
    const conditions = whereClause.split(/\s+AND\s+/i);
    let paramIndex = 0;

    for (const cond of conditions) {
      const trimmed = cond.trim();
      
      // key = ? OR c.key = ?
      const eqMatch = trimmed.match(/(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)\s*=\s*(\?|'[^']*'|[0-9]+)/);
      if (eqMatch) {
        const col = eqMatch[1].toLowerCase();
        let expected: any = eqMatch[2];
        if (expected === '?') {
          expected = params[paramIndex++];
        } else if (expected.startsWith("'")) {
          expected = expected.slice(1, -1);
        } else {
          expected = Number(expected);
        }

        const actual = row[col];
        if (actual != expected) return false;
        continue;
      }

      // col IS NOT NULL
      if (trimmed.toUpperCase().includes('IS NOT NULL')) {
        const col = trimmed.split(/\s+/)[0].replace(/^[a-zA-Z0-9_]+\./, '').toLowerCase();
        if (row[col] === null || row[col] === undefined) return false;
        continue;
      }
    }

    return true;
  }
}

export const db = new EmbeddedDatabase(config.dbPath);

export function initDatabase() {
  console.log('[DB] Initializing database and running schema migrations...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users;
    CREATE TABLE IF NOT EXISTS memories;
    CREATE TABLE IF NOT EXISTS conversations;
    CREATE TABLE IF NOT EXISTS messages;
    CREATE TABLE IF NOT EXISTS documents;
    CREATE TABLE IF NOT EXISTS document_chunks;
    CREATE TABLE IF NOT EXISTS artifacts;
    CREATE TABLE IF NOT EXISTS tasks;
    CREATE TABLE IF NOT EXISTS forecast_models;
    CREATE TABLE IF NOT EXISTS forecast_predictions;
    CREATE TABLE IF NOT EXISTS audit_logs;
    CREATE TABLE IF NOT EXISTS feature_flags;
    CREATE TABLE IF NOT EXISTS contacts;
  `);

  seedInitialData();
  console.log('[DB] Database schema and initial data ready.');
}

function seedInitialData() {
  // Seed Feature Flags
  const insertFlag = db.prepare(`
    INSERT OR IGNORE INTO feature_flags (id, key, description, is_enabled)
    VALUES (?, ?, ?, ?)
  `);

  const flags = [
    ['flag-1', 'voice_synthesis', 'Enable browser speech synthesis and voice input', 1],
    ['flag-2', 'advanced_rag', 'Enable document chunking and semantic search retrieval', 1],
    ['flag-3', 'ml_forecasting', 'Enable statistical forecasting and confidence bounds', 1],
    ['flag-4', 'code_sandbox', 'Enable in-browser code execution and artifact sandbox', 1],
    ['flag-5', 'tool_confirmation_gate', 'Require explicit user approval for high-impact actions', 1],
  ];

  for (const flag of flags) {
    insertFlag.run(...flag);
  }

  // Seed Demo User and Admin User
  const demoUserId = 'usr-demo-001';
  const adminUserId = 'usr-admin-001';

  const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(demoUserId);
  if (!userExists) {
    const demoPasswordHash = hashPassword('PrachiAI2026!');
    const adminPasswordHash = hashPassword('AdminPass2026!');

    db.prepare(`
      INSERT INTO users (id, email, phone, password_hash, full_name, role, preferences_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      demoUserId,
      'demo@prachi.ai',
      '9876543210',
      demoPasswordHash,
      'Pari Verma',
      'user',
      JSON.stringify({
        theme: 'dark',
        ai_tone: 'helpful_concise',
        auto_speak: false,
        memory_enabled: true
      })
    );

    db.prepare(`
      INSERT INTO users (id, email, phone, password_hash, full_name, role, preferences_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminUserId,
      'admin@prachi.ai',
      '9876543211',
      adminPasswordHash,
      'System Admin',
      'admin',
      JSON.stringify({
        theme: 'dark',
        ai_tone: 'analytical',
        memory_enabled: true
      })
    );

    // Seed Demo Memories
    const insertMemory = db.prepare(`
      INSERT INTO memories (id, user_id, category, content, confidence, tags_json, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertMemory.run('mem-1', demoUserId, 'preference', 'Prefers code snippets written in modern TypeScript with clear inline comments.', 0.98, JSON.stringify(['typescript', 'coding', 'preference']), 1);
    insertMemory.run('mem-2', demoUserId, 'fact', 'Working on launching Prachi AI virtual personal assistant platform.', 0.95, JSON.stringify(['project', 'prachi-ai']), 1);
    insertMemory.run('mem-3', demoUserId, 'preference', 'Prefers concise executive summaries before deep detailed explanations.', 0.92, JSON.stringify(['communication', 'style']), 1);
    insertMemory.run('mem-4', demoUserId, 'project', 'Current sprint goal: complete all 15 phases of Prachi AI factory kit.', 0.99, JSON.stringify(['sprint', 'goals']), 1);

    // Seed Demo Tasks
    const insertTask = db.prepare(`
      INSERT INTO tasks (id, user_id, title, description, due_date, priority, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertTask.run('task-1', demoUserId, 'Review Prachi AI Multimodal Architecture', 'Examine vision and RAG pipeline integration specs', '2026-10-05', 'high', 'in_progress');
    insertTask.run('task-2', demoUserId, 'Train Forecasting Model on Q3 Sales Data', 'Run linear regression and exponential smoothing with confidence intervals', '2026-10-06', 'medium', 'pending');
    insertTask.run('task-3', demoUserId, 'Test User Confirmation Gate for Email Tool', 'Verify modal prevents execution until user clicks approve', '2026-10-07', 'high', 'pending');

    // Seed Demo Artifact
    db.prepare(`
      INSERT INTO artifacts (id, user_id, title, type, content, version, tags_json, is_favorite)
      VALUES (?, ?, ?, ?, ?, 1, ?, 1)
    `).run(
      'art-1',
      demoUserId,
      'Prachi AI Architecture Summary',
      'markdown',
      '# Prachi AI Architecture\n\nPrachi AI is a unified personal assistant and AI workspace platform featuring:\n- **AI Orchestrator**: Dynamic routing across Gemini, Claude, OpenAI, and Local Heuristic engine.\n- **User-Approved Memory**: Inspectable and privacy-safe personal memory bank.\n- **Multimodal Vision & Docs**: OCR, object detection, and grounded document RAG.\n- **Predictive Engine**: Time-series analytics with uncertainty quantification.\n- **Secure Tool Execution**: Confirmation gates for high-impact actions.\n',
      JSON.stringify(['architecture', 'documentation'])
    );

    // Seed Welcome Conversation
    const convId = 'conv-welcome-001';
    db.prepare(`
      INSERT INTO conversations (id, user_id, title, mode, system_prompt)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      convId,
      demoUserId,
      'Welcome to Prachi AI',
      'general',
      'You are Prachi AI, an intelligent, empathetic, highly capable multimodal virtual personal assistant.'
    );

    db.prepare(`
      INSERT INTO messages (id, conversation_id, user_id, role, content, token_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'msg-1',
      convId,
      demoUserId,
      'assistant',
      'Hello Pari! Welcome to your personal Prachi AI workspace. I have already loaded your active memories, tasks, and system tools. How can I assist your workflow today?',
      38
    );
  } else {
    try {
      db.prepare('UPDATE users SET phone = ? WHERE id = ?').run('9876543210', demoUserId);
      db.prepare('UPDATE users SET phone = ? WHERE id = ?').run('9876543211', adminUserId);
    } catch {}
  }

  // Seed sample contacts for demo user if none exist
  try {
    const existingContacts = db.prepare('SELECT id FROM contacts WHERE user_id = ?').all(demoUserId);
    if (!existingContacts || existingContacts.length === 0) {
      const insertContact = db.prepare(`
        INSERT INTO contacts (id, user_id, name, phone, relationship, email, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertContact.run('cnt-1', demoUserId, 'Papa', '+919876500001', 'Father / Papa', 'papa@family.com', 'Home landline/mobile');
      insertContact.run('cnt-2', demoUserId, 'Mummy', '+919876500002', 'Mother / Mummy', 'mummy@family.com', 'Home mobile');
      insertContact.run('cnt-3', demoUserId, 'Rahul Sharma', '+919876500003', 'Friend / Colleague', 'rahul@work.com', 'Tech teammate');
      insertContact.run('cnt-4', demoUserId, 'Rohan Verma', '+919876500004', 'Brother / Bhai', 'rohan@family.com', 'Younger brother');
      insertContact.run('cnt-5', demoUserId, 'Priya Patel', '+919876500005', 'Best Friend', 'priya@gmail.com', 'College friend');
      insertContact.run('cnt-6', demoUserId, 'Boss (Mr. Rajesh)', '+919876500006', 'Manager / Boss', 'rajesh.boss@company.com', 'Project manager');
    }
  } catch (err) {
    console.warn('[DB] Contact seeding skipped or error:', err);
  }
}
