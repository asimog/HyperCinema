import { JobPackage, JobStatus, PackageType } from "@/lib/types/domain";

export const PACKAGE_CONFIG: Record<PackageType, JobPackage> = {
  "30s": {
    packageType: "30s",
    rangeDays: 1,
    priceSol: 0.004,
    priceUsdc: 1,
    videoSeconds: 30,
    enabled: true,
    label: "30s",
    subtitle: "Fast video",
  },
  "60s": {
    packageType: "60s",
    rangeDays: 1,
    priceSol: 0.007,
    priceUsdc: 2,
    videoSeconds: 60,
    enabled: true,
    label: "60s",
    subtitle: "Full short",
  },
};

export const ACTIVE_PACKAGE_TYPES = ["30s", "60s"] as const satisfies readonly PackageType[];

export const FINAL_JOB_STATUSES: JobStatus[] = ["complete", "failed"];

export const PUMP_SOURCES = new Set([
  "PUMP_FUN",
  "PUMP",
  "PUMP_AMM",
  "PUMP_SWAP",
]);
