import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runPrediction(records) {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, "..", "..", "..", "ml", "predict.py");
    const py = process.platform === "win32" ? "python" : "python3";
    const child = spawn(py, [script], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: path.join(__dirname, "..", "..", ".."),
    });

    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(err || `predict.py exited ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(out.trim() || "{}"));
      } catch (e) {
        reject(e);
      }
    });

    child.stdin.write(JSON.stringify({ records }));
    child.stdin.end();
  });
}
