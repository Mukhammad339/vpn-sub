// /api/admin/servers.js
// Возвращает список серверов из vpn_keys для панели управления

const PROJECT = "vless-panel";
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const ADMIN_KEY = process.env.ADMIN_KEY || "changeme";

function str(field) { return field?.stringValue ?? ""; }

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "x-admin-key");
  if (req.method === "OPTIONS") return res.status(200).end();

  const key = req.headers["x-admin-key"] || req.query.adminKey;
  if (key !== ADMIN_KEY) return res.status(401).json({ error: "Unauthorized" });

  const r = await fetch(`${FS}/vpn_keys?pageSize=50`);
  const data = await r.json();
  const docs = data.documents || [];

  const servers = docs.map(doc => ({
    id: doc.name.split("/").pop(),
    name: str(doc.fields?.name),
    key: str(doc.fields?.key) || str(doc.fields?.link),
    createdAt: str(doc.fields?.createdAt),
  }));

  res.status(200).json(servers);
}
