import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, "package.json");

const forbiddenPackagePatterns = [
  /walletconnect/i,
  /@solana\/wallet-adapter/i,
  /@web3modal/i,
  /rainbowkit/i,
];

const forbiddenCodePatterns = [
  /walletconnect/i,
  /wallet-adapter/i,
  /\buseWallet\s*\(/,
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function matchesForbiddenPackage(name) {
  return forbiddenPackagePatterns.some((pattern) => pattern.test(name));
}

function collectFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, out);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      continue;
    }
    out.push(fullPath);
  }
  return out;
}

function relative(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, "/");
}

function main() {
  const pkg = readJson(packageJsonPath);
  const dependencies = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };

  const forbiddenPackages = Object.keys(dependencies).filter(matchesForbiddenPackage);
  if (forbiddenPackages.length > 0) {
    console.error("Forbidden wallet-connect dependencies detected:");
    for (const name of forbiddenPackages) {
      console.error(`- ${name}`);
    }
    process.exit(1);
  }

  const sourceRoots = ["app", "components", "lib", "workers"];
  const files = sourceRoots.flatMap((dir) => collectFiles(path.join(rootDir, dir)));
  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of forbiddenCodePatterns) {
      if (pattern.test(content)) {
        violations.push(`${relative(file)} matches ${pattern}`);
      }
    }
  }

  if (violations.length > 0) {
    console.error("Forbidden wallet-connect code patterns detected:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }
}

main();

