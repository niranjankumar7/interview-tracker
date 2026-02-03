import { PrepClient } from "./prep-client";

type PrepPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PrepPage({ searchParams }: PrepPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  const applicationIdRaw = resolvedSearchParams.applicationId;
  const focusApplicationId = Array.isArray(applicationIdRaw)
    ? applicationIdRaw[0]
    : applicationIdRaw;

  return <PrepClient focusApplicationId={focusApplicationId} />;
}
