import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function ensureDatabaseSeeded(): void {
	const scriptPath = path.resolve(__dirname, "seed_runner.cjs");
	const backendDir = path.resolve(__dirname, "../../..", "QLHK-Backend");
	execSync(`node "${scriptPath}"`, {
		cwd: backendDir,
		stdio: "inherit",
	});
}
