// /api/admin/users.js
// CRUD для пользователей. Защищён паролем через заголовок x-admin-key
// или query-параметром ?adminKey=... (для удобства из панели)
//
// Установить пароль: Vercel Dashboard → Settings → Environment Variables
// ADMIN_KEY = любой_секретный_пароль

const PROJECT = "vless-panel";
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const ADMIN_KEY = process.env.ADMIN_KEY || "changeme";

function auth(req) {
  const key = req.headers["x-admin-key"] || req.query.adminKey;
  return key === ADMIN_KEY;
}

function str(field) { return field?.stringValue ?? ""; }

function parseDoc(doc) {
  const f = doc.fields || {};
  const id = doc.name.split("/").pop();
  const result = { _id: id };
  for (const [k, v] of Object.entries(f)) result[k] = str(v);
  return result;
}

function toFsFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "_id") continue;
    fields[k] = { stringValue: String(v ?? "") };
  }
  return fields;
}

async function fsGetAll(col) {
  const r = await fetch(`${FS}/${col}?pageSize=100`);
  if (!r.ok) return [];
  const d = await r.json();
  return (d.documents || []).map(parseDoc);
}

async function fsSet(col, id, data) {
  const fields = toFsFields(data);
  const fieldPaths = Object.keys(fields).join(",");
  const url = `${FS}/${col}/${id}?updateMask.fieldPaths=${encodeURIComponent(fieldPaths)}`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });
  return r.json();
}

async function fsDelete(col, id) {
  await fetch(`${FS}/${col}/${id}`, { method: "DELETE" });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "x-admin-key, content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!auth(req)) return res.status(401).json({ error: "Unauthorized" });

  const { method } = req;

  // GET /api/admin/users — список всех пользователей
  if (method === "GET") {
    const users = await fsGetAll("vpn_users");
    return res.status(200).json(users);
  }

  // GET /api/admin/users?servers=1 — список серверов из vpn_keys
  if (method === "GET" && req.query.servers) {
    const servers = await fsGetAll("vpn_keys");
    return res.status(200).json(servers);
  }

  // POST /api/admin/users — создать пользователя
  if (method === "POST") {
    const body = req.body;
    const id = "u_" + Date.now();
    await fsSet("vpn_users", id, { ...body, _id: undefined });
    return res.status(200).json({ _id: id, ...body });
  }

  // PUT /api/admin/users?id=xxx — обновить пользователя
  if (method === "PUT") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });
    const body = req.body;
    await fsSet("vpn_users", id, body);
    return res.status(200).json({ _id: id, ...body });
  }

  // DELETE /api/admin/users?id=xxx — удалить пользователя
  if (method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });
    await fsDelete("vpn_users", id);
    return res.status(200).json({ deleted: id });
  }

  res.status(405).json({ error: "Method not allowed" });
}
