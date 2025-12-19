import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-client';
import { getForumContext } from '../../services/forum';

export type ForumEntityType = 'category' | 'subcategory' | 'subforum' | 'topic';

export interface ForumBreadcrumb {
    name: string;
    slug: string;
    type: ForumEntityType | 'root';
}

export interface ForumStats {
    total_topics?: number;
    total_posts?: number;
    view_count?: number;
    reply_count?: number;
    last_post_at?: string;
}

export interface ForumEntity {
    id: string;
    slug: string;
    name: string;
    title?: string;
    description?: string;
    content?: string;
    icon?: string;
    show_icon?: boolean;
    sort_order?: number;
    is_pinned?: boolean;
    is_locked?: boolean;
    is_important?: boolean;
    author_id?: string;
    created_at?: string;
    stats: ForumStats;
}

export interface ForumHierarchyNode {
    id: string;
    name: string;
    slug: string;
    type: ForumEntityType;
    description?: string;
    icon?: string;
    show_icon?: boolean;
    stats?: ForumStats;
}

export interface ForumContextResponse {
    type: ForumEntityType | null;
    entity: ForumEntity | null;
    hierarchy: {
        parent: ForumHierarchyNode | null;
        children: ForumHierarchyNode[];
    } | null;
    breadcrumbs: ForumBreadcrumb[];
}

interface UseForumContextParams {
    slug?: string;
    parentSlug?: string;
    expectedType?: ForumEntityType;
    parentType?: 'subcategory' | 'subforum';
    options?: Omit<UseQueryOptions<ForumContextResponse>, 'queryKey' | 'queryFn'>;
}

export function useForumContext({
    slug,
    parentSlug,
    expectedType,
    parentType,
    options
}: UseForumContextParams) {
    const queryKey = queryKeys.forumContext(slug, parentSlug, expectedType, parentType);

    return useQuery<ForumContextResponse>({
        queryKey,
        queryFn: async () => {
            if (!slug) return { type: null, entity: null, hierarchy: null, breadcrumbs: [] };

            const result = await getForumContext(slug, parentSlug, expectedType, parentType);

            if (result.error) throw new Error(result.error.message);

            return result.data!;
        },
        enabled: !!slug,
        staleTime: 10 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        retry: false,
        ...options,
    });
}
