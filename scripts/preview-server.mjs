import http from "http";
import fs from "fs";
import path from "path";

const file = path.resolve("public/sa-dashboard-preview.html");
const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(fs.readFileSync(file));
});
server.listen(8765, "127.0.0.1", () => {
  console.log("preview http://127.0.0.1:8765");
});
