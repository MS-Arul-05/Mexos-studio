import type { Category } from '@prisma/client';
import { categoriesRepository } from './categories.repository';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: CategoryNode[];
}

/** Build a nested tree from the flat category list using parentId (Epic 6.1). */
function buildTree(categories: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const c of categories) {
    byId.set(c.id, { id: c.id, name: c.name, slug: c.slug, parentId: c.parentId, children: [] });
  }

  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    // Parent may be missing/dangling → treat as a root so nothing is dropped.
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export const categoriesService = {
  async tree(): Promise<CategoryNode[]> {
    const categories = await categoriesRepository.findAll();
    return buildTree(categories);
  },
};
