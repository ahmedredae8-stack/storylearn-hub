#!/usr/bin/env node
/**
 * تصدير كل محتوى الدروس من Supabase إلى JSON + SQL (بدون أي تعديل على البيانات).
 *
 * التشغيل:
 *   SUPABASE_URL=... SUPABASE_KEY=... node tools/export-content.mjs
 * وإن كانت سياسات RLS تمنع القراءة بالمفتاح العام، أضف حساب دخول:
 *   SUPABASE_EMAIL=... SUPABASE_PASSWORD=... node tools/export-content.mjs
 * الأفضل: استخدم Service Role key في SUPABASE_KEY فيقرأ كل شيء مباشرة.
 *
 * المخرجات في مجلد export/:
 *   <table>.json        بيانات خام
 *   content.json        كل الجداول في ملف واحد
 *   content_import.sql  INSERT جاهز للاستيراد في مشروع آخر
 */

const URL_ = process.env.SUPABASE_URL || 'https://mzvqecfinozalmdiwhfz.supabase.co';
const KEY = process.env.SUPABASE_KEY || 'sb_publishable_j9t2sflw_j5tGVoBF3Bd8Q_lj11hh6N';
const EMAIL = process.env.SUPABASE_EMAIL;
const PASSWORD = process.env.SUPABASE_PASSWORD;
const OUT = process.env.OUT_DIR || 'export';

// الترتيب مهم للاستيراد (المفاتيح الأجنبية)
const TABLES = [
  'courses',
  'characters',
  'units',
  'lessons',
  'lesson_steps',
  'avatars',
  'site_settings',
];

const fs = await import('node:fs/promises');

let accessToken = null;
if (EMAIL && PASSWORD) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await r.json();
  if (!r.ok) {
    console.error('فشل تسجيل الدخول:', j.error_description || j.msg || JSON.stringify(j));
    process.exit(1);
  }
  accessToken = j.access_token;
  console.log('تم تسجيل الدخول ✅');
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${accessToken || KEY}`,
};

async function fetchAll(table) {
  const rows = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const url = `${URL_}/rest/v1/${table}?select=*&order=id.asc&limit=${page}&offset=${from}`;
    const r = await fetch(url, { headers });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`${table}: ${r.status} ${t.slice(0, 200)}`);
    }
    const chunk = await r.json();
    rows.push(...chunk);
    if (chunk.length < page) break;
  }
  return rows;
}

function sqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

function toInserts(table, rows) {
  if (!rows.length) return `-- ${table}: لا توجد صفوف\n`;
  const cols = Object.keys(rows[0]);
  const head = `INSERT INTO public.${table} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES\n`;
  const body = rows
    .map((r) => `  (${cols.map((c) => sqlValue(r[c])).join(', ')})`)
    .join(',\n');
  return `${head}${body}\nON CONFLICT (id) DO NOTHING;\n\n`;
}

await fs.mkdir(OUT, { recursive: true });
const all = {};
let sql = `-- تصدير محتوى Nilex — ${new Date().toISOString()}\nBEGIN;\n\n`;

for (const t of TABLES) {
  try {
    const rows = await fetchAll(t);
    all[t] = rows;
    await fs.writeFile(`${OUT}/${t}.json`, JSON.stringify(rows, null, 2));
    sql += toInserts(t, rows);
    console.log(`${t}: ${rows.length} صف`);
  } catch (e) {
    all[t] = [];
    console.warn(`تخطي ${t} → ${e.message}`);
    sql += `-- تخطي ${table_safe(t)}: ${String(e.message).replace(/\n/g, ' ')}\n\n`;
  }
}

function table_safe(t) {
  return t;
}

sql += 'COMMIT;\n';
await fs.writeFile(`${OUT}/content.json`, JSON.stringify(all, null, 2));
await fs.writeFile(`${OUT}/content_import.sql`, sql);
console.log(`\nتم ✅ الملفات في مجلد ${OUT}/`);
