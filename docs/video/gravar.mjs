// Grava o farol-celular.html quadro a quadro e monta o MP4 com o ffmpeg.
// Uso: node docs/video/gravar.mjs site/video/farol-celular.mp4 30       Prévia de quadros: node gravar.mjs --quadros 5,12,30
// Precisa do Chromium do sistema e do pacote puppeteer-core (npm install puppeteer-core).
import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const pagina = "file://" + path.join(aqui, "farol-celular.html") + "?gravar";
const ESCALA = 1.5; // 720x1280 vira 1080x1920

const navegador = await puppeteer.launch({
  executablePath: process.env.CHROMIUM || "/usr/bin/chromium",
  args: ["--allow-file-access-from-files", "--font-render-hinting=none"],
});
const aba = await navegador.newPage();
await aba.setViewport({ width: 720, height: 1280, deviceScaleFactor: ESCALA });
await aba.goto(pagina, { waitUntil: "networkidle0" });
await aba.evaluate(() => document.fonts.ready);

if (process.argv[2] === "--quadros") {
  for (const s of process.argv[3].split(",")) {
    await aba.evaluate((t) => window.render(t), parseFloat(s));
    await aba.screenshot({ path: path.join(aqui, `quadro-${s}.png`) });
  }
} else {
  const saida = process.argv[2] || "farol-celular.mp4";
  const fps = parseInt(process.argv[3] || "30", 10);
  const duracao = await aba.evaluate(() => window.DURACAO);
  const ffmpeg = spawn("ffmpeg", [
    "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", saida,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const total = Math.round(duracao * fps);
  for (let i = 0; i < total; i++) {
    await aba.evaluate((t) => window.render(t), i / fps);
    const png = await aba.screenshot({ type: "png" });
    if (!ffmpeg.stdin.write(png)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
    if (i % (fps * 5) === 0) process.stdout.write(`${Math.round(i / fps)}s `);
  }
  ffmpeg.stdin.end();
  await new Promise((r) => ffmpeg.on("close", r));
  console.log("\npronto:", saida);
}
await navegador.close();
