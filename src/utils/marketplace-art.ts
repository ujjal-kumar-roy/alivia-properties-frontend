/**
 * Curated artwork for the five marketplace departments. A category without a
 * photo of its own falls back to its DEPARTMENT's art, so a tile never shows a
 * picture that contradicts its name (cement bags on "Electrician").
 */
export const DEPT_ART: Record<string, string> = {
  "raw-materials": "/marketplace-reference/cat-materials.png",
  finishing: "/marketplace-reference/cat-interior.png",
  utilities: "/marketplace-reference/cat-plumbing.png",
  "safety-electronics": "/marketplace-reference/cat-safety.png",
  services: "/marketplace-reference/cat-services.png",
}

export const GENERIC_CATEGORY_ART = "/marketplace-reference/cat-materials.png"
