#!/usr/bin/env node
/**
 * Android emulator helpers (spec 022).
 *   node scripts/android/android.mjs emulator   start the AVD without a window (see the screen with `adb exec-out screencap -p`)
 *   node scripts/android/android.mjs run        cap sync + installDebug + adb reverse + open the app
 * `run` expects `pnpm dev` and, to sign in, the backend stack (../basketIQ-backend, `make up`).
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_ID, DEV_URL } from "../../capacitor.config.ts";

const AVD = "basketiq-pixel7";
// Vite (app and /v1 proxy), mock OIDC (sign-in redirect), storage (presigned uploads from the browser).
const REVERSE_PORTS = [5173, 8080, 9000];

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WIN = process.platform === "win32";
const SDK = process.env.ANDROID_HOME ?? path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
const exe = (name) => (WIN ? `${name}.exe` : name);
const ADB = path.join(SDK, "platform-tools", exe("adb"));
const EMULATOR = path.join(SDK, "emulator", exe("emulator"));
const env = { ...process.env, ANDROID_HOME: SDK };

function sh(cmd, args, opts = {}) {
  // A .bat needs cmd.exe on Windows; going through it explicitly keeps Node quoting the arguments.
  const [file, argv] = WIN && cmd.endsWith(".bat") ? [process.env.ComSpec ?? "cmd.exe", ["/d", "/c", cmd, ...args]] : [cmd, args];
  const r = spawnSync(file, argv, { stdio: "inherit", env, ...opts });
  if (r.status !== 0) throw new Error(`${path.basename(cmd)} ${args.join(" ")} failed (exit ${r.status})`);
  return r;
}
const adb = (...args) => spawnSync(ADB, args, { encoding: "utf8", env }).stdout?.trim() ?? "";

function requireSdk() {
  for (const f of [ADB, EMULATOR])
    if (!existsSync(f)) throw new Error(`Not found: ${f}. Run scripts/android/setup.ps1 to see what is missing.`);
}

async function waitForBoot() {
  sh(ADB, ["wait-for-device"]);
  for (let i = 0; i < 120; i++) {
    if (adb("shell", "getprop", "sys.boot_completed") === "1") return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("The emulator did not finish booting in 4 minutes.");
}

async function emulator() {
  requireSdk();
  if (adb("devices").split("\n").some((l) => /^emulator-\d+\s+device$/.test(l))) {
    console.log("An emulator is already running.");
    return;
  }
  spawn(EMULATOR, ["-avd", AVD, "-no-window", "-no-audio", "-no-snapshot-save", "-no-boot-anim"], {
    detached: true,
    stdio: "ignore",
    env,
  }).unref();
  console.log(`Starting ${AVD}…`);
  await waitForBoot();
  console.log("Emulator ready.");
}

async function run() {
  requireSdk();
  if (!(await fetch(DEV_URL).then((r) => r.ok, () => false)))
    console.warn(`Warning: ${DEV_URL} is not answering. Start it with \`pnpm dev\`.`);
  sh(process.execPath, [path.join(ROOT, "node_modules/@capacitor/cli/bin/capacitor"), "sync", "android"], {
    cwd: ROOT,
    env: { ...env, CAP_SERVER_URL: DEV_URL },
  });
  await waitForBoot();
  sh(path.join(ROOT, "android", WIN ? "gradlew.bat" : "gradlew"), ["installDebug", "-q"], { cwd: path.join(ROOT, "android") });
  for (const port of REVERSE_PORTS) sh(ADB, ["reverse", `tcp:${port}`, `tcp:${port}`]);
  sh(ADB, ["shell", "am", "start", "-W", "-n", `${APP_ID}/.MainActivity`]);
}

const commands = { emulator, run };
const cmd = commands[process.argv[2]];
if (!cmd) {
  console.error(`Usage: node scripts/android/android.mjs <${Object.keys(commands).join("|")}>`);
  process.exit(2);
}
cmd().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
