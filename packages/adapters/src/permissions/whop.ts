export type WhopPermissionsAdapter = {
  id: string;
  label: string;
  kind: "whop-permissions";
  docsUrl: string;
  installUrl?: string;
  requiredPermissions: string[];
};

export function createWhopPermissionsAdapter(input: {
  installUrl?: string;
  requiredPermissions?: string[];
} = {}): WhopPermissionsAdapter {
  return {
    id: "whop-permissions",
    label: "Whop Permissions",
    kind: "whop-permissions",
    docsUrl: "https://docs.whop.com/developer/guides/permissions",
    installUrl: input.installUrl,
    requiredPermissions: input.requiredPermissions ?? [],
  };
}
