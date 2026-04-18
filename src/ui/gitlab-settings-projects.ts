import { fetchJson } from "./gitlab-settings-http.js";

interface CompanyProjectSummary {
  id: string;
  name: string;
  archivedAt: string | null;
}

export async function listCompanyProjects(companyId: string): Promise<CompanyProjectSummary[]> {
  const response = await fetchJson<unknown>(`/api/companies/${companyId}/projects`);
  if (!Array.isArray(response)) {
    throw new Error(`Unexpected projects response for company ${companyId}: expected an array.`);
  }

  return response
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id.trim() : "";
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const archivedAt = typeof record.archivedAt === "string" && record.archivedAt.trim() ? record.archivedAt : null;
      return id && name ? { id, name, archivedAt } : null;
    })
    .filter((entry): entry is CompanyProjectSummary => entry !== null);
}

async function ensureProjectUnarchived(projectId: string): Promise<void> {
  await fetchJson(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({
      archivedAt: null,
    }),
  });
}

export async function resolveOrCreateProject(
  companyId: string,
  projectName: string,
): Promise<{ id: string; name: string }> {
  const projects = await listCompanyProjects(companyId);
  const existing = projects.find((project) => project.name.trim().toLowerCase() === projectName.trim().toLowerCase());
  if (existing) {
    if (existing.archivedAt) {
      await ensureProjectUnarchived(existing.id);
    }
    return existing;
  }

  return fetchJson<{ id: string; name: string }>(`/api/companies/${companyId}/projects`, {
    method: "POST",
    body: JSON.stringify({
      name: projectName.trim(),
      status: "planned",
      executionWorkspacePolicy: {
        enabled: true,
      },
    }),
  });
}
