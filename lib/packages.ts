import { PACKAGE_CONFIG } from "@/lib/constants";
import { JobPackage, PackageType } from "@/lib/types/domain";

const PACKAGE_BY_DURATION = new Map<number, JobPackage>(
  Object.values(PACKAGE_CONFIG).map((item) => [item.videoSeconds, item]),
);

export function getPackageConfig(packageType: PackageType): JobPackage {
  return PACKAGE_CONFIG[packageType];
}

export function resolvePackageFromDuration(
  durationSeconds: number,
): JobPackage | null {
  return PACKAGE_BY_DURATION.get(durationSeconds) ?? null;
}

export function resolvePackage(input: {
  packageType?: PackageType | null;
  durationSeconds?: number | null;
}): JobPackage | null {
  if (input.packageType) {
    return PACKAGE_CONFIG[input.packageType] ?? null;
  }

  if (typeof input.durationSeconds === "number") {
    return resolvePackageFromDuration(input.durationSeconds);
  }

  return null;
}
