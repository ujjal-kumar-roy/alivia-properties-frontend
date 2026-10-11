import type { PropertyDocument } from "@/types/document.types"
import { httpClient } from "./http-client"

export async function getDocuments(
  propertyId: string,
): Promise<{ data: PropertyDocument[] }> {
  const session = await (await import("@/auth")).auth()
  const token = session?.accessToken
  try {
    const data = await httpClient.get<PropertyDocument[]>("/documents", {
      query: { propertyId },
      token,
      cache: "no-store",
    })
    return { data: Array.isArray(data) ? data : [] }
  } catch {
    return { data: [] }
  }
}
