export default async function handler(req, res) {
  const project = "vless-panel";
  const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/vpn_keys`;
  
  const r = await fetch(url);
  const data = await r.json();

  // Временно для дебага — убери после проверки
  if (!data.documents) {
    res.setHeader("content-type", "application/json");
    return res.status(200).json(data); // покажет ошибку от Firestore
  }

  let list = [];
  for (let doc of data.documents) {
    const fields = doc.fields;
    if (fields?.key)  list.push(fields.key.stringValue);
    if (fields?.link) list.push(fields.link.stringValue);
  }

  res.setHeader("content-type", "text/plain");
  res.send(list.join("\n"));
}
