import { PROVIDER_CATALOG, type ProviderDescriptor } from "./providers";

export interface ExecutionPolicy {
  id: string;
  externalNetworkAllowed: false;
  allowedDeploymentModes: readonly ["local"];
  imageDataMayLeaveSite: false;
  metadataMayLeaveSite: false;
}

export const LOCAL_ONLY_EXECUTION_POLICY: ExecutionPolicy = {
  id: "local-only-v1",
  externalNetworkAllowed: false,
  allowedDeploymentModes: ["local"],
  imageDataMayLeaveSite: false,
  metadataMayLeaveSite: false,
};

export function isRuntimeProviderAllowed(
  provider: ProviderDescriptor,
  policy: ExecutionPolicy = LOCAL_ONLY_EXECUTION_POLICY,
): boolean {
  return (
    policy.externalNetworkAllowed === false &&
    provider.deploymentModes.includes("local") &&
    !provider.deploymentModes.includes("external-api") &&
    provider.status !== "commercial-api"
  );
}

export function getRuntimeProviders(
  policy: ExecutionPolicy = LOCAL_ONLY_EXECUTION_POLICY,
): ProviderDescriptor[] {
  return PROVIDER_CATALOG.filter((provider) => isRuntimeProviderAllowed(provider, policy));
}

export function assertRuntimeProviderAllowed(
  providerId: string,
  policy: ExecutionPolicy = LOCAL_ONLY_EXECUTION_POLICY,
): ProviderDescriptor {
  const provider = PROVIDER_CATALOG.find((item) => item.id === providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  if (!isRuntimeProviderAllowed(provider, policy)) {
    throw new Error(
      `Provider ${providerId} is not permitted by ${policy.id}; runtime processing is local-only and no image/metadata may leave the site.`,
    );
  }
  return provider;
}
