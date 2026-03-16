// /api/u/[token].js
// Уникальная ссылка пользователя: https://vpnjr.vercel.app/api/u/ЕГО_ТОКЕН
// Читает пользователя из коллекции vpn_users, ключи из vpn_keys

const PROJECT = "vless-panel";
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

async function fsGetDoc(collection, docId) {
  const r = await fetch(`${FS}/${collection}/${docId}`);
  if (!r.ok) return null;
  return r.json();
}

async function fsGetAll(collection) {
  const r = await fetch(`${FS}/${collection}?pageSize=100`);
  if (!r.ok) return [];
  const data = await r.json();
  return data.documents || [];
}

function str(field) {
  return field?.stringValue ?? "";
}

function parseDoc(doc) {
  const f = doc.fields || {};
  const id = doc.name.split("/").pop();
  const result = { _id: id };
  for (const [k, v] of Object.entries(f)) {
    result[k] = str(v);
  }
  return result;
}

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(404).send("Not Found");

  // 1. Найти пользователя по токену
  const userDocs = await fsGetAll("vpn_users");
  const userDoc = userDocs.find(d => str(d.fields?.token) === token);
  if (!userDoc) return res.status(404).send("Not Found");

  const user = parseDoc(userDoc);

  // 2. Проверить статус и дату окончания
  if (user.status === "paused") {
    return res.status(403).send("Subscription paused");
  }
  if (user.start && user.days) {
    const end = new Date(new Date(user.start).getTime() + parseInt(user.days) * 86400000);
    if (new Date() > end) return res.status(403).send("Subscription expired");
  }

  // 3. Серверы пользователя — JSON-массив строк: ["finland","USA","3rd"]
  let servers = [];
  try { servers = JSON.parse(user.servers || "[]"); } catch { servers = []; }
  if (!servers.length) return res.status(200).send("");

  // 4. Получить vless-ключи из vpn_keys для каждого сервера
  const keys = [];
  for (const serverId of servers) {
    const doc = await fsGetDoc("vpn_keys", serverId);
    if (!doc) continue;
    const parsed = parseDoc(doc);
    if (parsed.key)  keys.push(parsed.key);
    if (parsed.link) keys.push(parsed.link);
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Profile-Title", encodeURIComponent(user.name || "VPN"));
  res.status(200).send(keys.join("\n"));
}
