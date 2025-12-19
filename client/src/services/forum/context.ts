/**
 * Forum Context Service
 * Handles the main hierarchy and entity resolution using the get_forum_context RPC
 */

import { supabase } from '../../lib/supabase';
import type { ApiResponse } from './types';
import type { ForumContextResponse } from '../../forum/hooks/useForumContext';

/**
 * Get forum entity context by slug and type hints
 * This is the primary driver for CategoryPage and TopicPage
 */
export async function getForumContext(
    slug: string,
    parentSlug?: string,
    expectedType?: string,
    parentType?: string
): Promise<ApiResponse<ForumContextResponse>> {
    try {
        if (!slug) {
            return { error: { message: 'Slug is required', code: 'INVALID_PARAMS' } };
        }

        const { data, error } = await supabase.rpc('get_forum_context', {
            p_slug: slug,
            p_parent_slug: parentSlug || null,
            p_expected_type: expectedType || null,
            p_parent_type: parentType || null,
        });

        if (error) {
            return { error: { message: error.message, code: error.code } };
        }

        if (!data || !data.type) {
            return {
                data: {
                    type: null,
                    entity: null,
                    hierarchy: { parent: null, children: [] },
                    breadcrumbs: []
                }
            };
        }

        return { data: data as ForumContextResponse };
    } catch (error) {
        return { error: { message: (error as Error).message, code: 'UNKNOWN_ERROR' } };
    }
}
