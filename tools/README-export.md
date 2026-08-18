# سحب كل الدروس من قاعدة البيانات (بدون تعديل)

سكربت واحد يقرأ الجداول ويكتبها كما هي: `tools/export-content.mjs`

## 1) التشغيل بأبسط صورة

```bash
node tools/export-content.mjs
```

يستخدم بيانات المشروع الحالي تلقائياً، لكن الجداول المحمية بـ RLS قد تعود فارغة.

## 2) التشغيل بحساب مستخدم (يقرأ الدروس المحمية)

```bash
SUPABASE_EMAIL="بريدك" SUPABASE_PASSWORD="كلمة المرور" node tools/export-content.mjs
```

## 3) الأفضل: مفتاح Service Role (يقرأ كل شيء بلا استثناء)

Supabase Dashboard → Settings → API → `service_role` key:

```bash
SUPABASE_URL="https://xxxx.supabase.co" \
SUPABASE_KEY="service_role_key" \
node tools/export-content.mjs
```

## المخرجات (مجلد `export/`)

| الملف | الوصف |
|---|---|
| `courses.json` `units.json` `lessons.json` `lesson_steps.json` `characters.json` … | كل جدول كما هو |
| `content.json` | كل الجداول في ملف واحد — مناسب لتغذية بوت آخر |
| `content_import.sql` | أوامر INSERT جاهزة للصق في SQL Editor بمشروع جديد |

## للبوت الآخر

أعطه `export/content.json` فقط — يحتوي على كل الدروس والخطوات والحوارات بالترتيب وبالتنسيق الأصلي، بدون أي تعديل. وللبنية (الجداول والسياسات) استخدم `/mnt/documents/db-export/nilex_schema_combined.sql`.
