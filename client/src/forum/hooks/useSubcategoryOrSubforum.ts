/**
 * Hook pentru încărcarea unei subcategorii sau subforum după slug
 * Folosește React Query pentru cache și performanță optimă
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/query-client';

interface SubcategoryData {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  category_id: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface SubforumData {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  subcategory_id: string;
  category_id: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface SubforumsWithStats {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  slug: string;
  sort_order: number;
  show_icon?: boolean | null;
  topicCount: number;
  postCount: number;
}

interface Result {
  type: 'subcategory' | 'subforum' | null;
  subcategory: SubcategoryData | null;
  subforum: SubforumData | null;
  subforums: SubforumsWithStats[];
  parentCategory: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function useSubcategoryOrSubforum(
  categorySlug: string | undefined, // Opțional acum - nu mai este necesar
  potentialSlug: string | undefined
) {
  return useQuery<Result>({
    queryKey: queryKeys.subcategoryOrSubforum(categorySlug || '', potentialSlug || ''),
    queryFn: async () => {
      if (!potentialSlug) {
        return {
          type: null,
          subcategory: null,
          subforum: null,
          subforums: [],
          parentCategory: null,
        };
      }

      // IMPORTANT: Căutăm mai întâi subforum (mai rar), apoi subcategorie (mai comun)
      // Asta reduce query-urile inutile și face prima încărcare mai rapidă
      // NU mai verificăm categorySlug - slug-urile subcategoriilor/subforum-urilor sunt unice global
      const subforumResult = await supabase
        .from('forum_subforums')
        .select('id, slug, name, subcategory_id, category_id')
        .eq('slug', potentialSlug)
        .eq('is_active', true)
        .maybeSingle();

      // Verifică dacă e subforum
      if (subforumResult.data) {
        const subforum = subforumResult.data;
        
        // Găsește categoria părinte (fără validare categorySlug)
        let categoryMatch = null;
        
        if (subforum.subcategory_id) {
          const { data: subcategory } = await supabase
            .from('forum_subcategories')
            .select('category_id, category:forum_categories!inner(id, slug, name)')
            .eq('id', subforum.subcategory_id)
            .maybeSingle();
          
          if (subcategory) {
            const categoryData = (subcategory as any).category;
            if (categoryData) {
              categoryMatch = categoryData;
            }
          }
        } else if (subforum.category_id) {
          // Subforum direct sub categorie (legacy)
          const { data: category } = await supabase
            .from('forum_categories')
            .select('id, slug, name')
            .eq('id', subforum.category_id)
            .maybeSingle();
          
          if (category) {
            categoryMatch = category;
          }
        }

        if (categoryMatch) {
          // E subforum! Încarcă descrierea și returnează
          const { data: subforumFull } = await supabase
            .from('forum_subforums')
            .select('description')
            .eq('id', subforum.id)
            .maybeSingle();

          return {
            type: 'subforum' as const,
            subcategory: null,
            subforum: {
              ...subforum,
              description: subforumFull?.description || null,
              category: categoryMatch,
            },
            subforums: [],
            parentCategory: categoryMatch,
          };
        }
      }

      // Dacă nu e subforum, verifică dacă e subcategorie
      const subcategoryResult = await supabase
        .from('forum_subcategories')
        .select('id, slug, name, description, category_id')
        .eq('slug', potentialSlug)
        .eq('is_active', true)
        .maybeSingle();

      if (subcategoryResult.data) {
        const subcategory = subcategoryResult.data;
        
        // Găsește categoria părinte (fără validare categorySlug)
        const { data: category } = await supabase
          .from('forum_categories')
          .select('id, slug, name')
          .eq('id', subcategory.category_id)
          .maybeSingle();

        if (category) {
          // E subcategorie! Încarcă subforums cu stats în paralel
          const [subforumsResult] = await Promise.all([
            supabase
              .from('forum_subforums')
              .select('id, name, description, icon, slug, sort_order, subcategory_id, show_icon')
              .eq('subcategory_id', subcategory.id)
              .eq('is_active', true)
              .order('sort_order', { ascending: true }),
          ]);

          // Calculează stats pentru subforums în paralel
          const subforumsWithStats: SubforumsWithStats[] = await Promise.all(
            (subforumsResult.data || []).map(async (sf) => {
              const [topicCountResult, topicIdsResult] = await Promise.all([
                supabase
                  .from('forum_topics')
                  .select('*', { count: 'exact', head: true })
                  .eq('subforum_id', sf.id)
                  .eq('is_deleted', false),
                supabase
                  .from('forum_topics')
                  .select('id')
                  .eq('subforum_id', sf.id)
                  .eq('is_deleted', false),
              ]);

              const topicCount = topicCountResult.count || 0;
              let postCount = 0;

              if (topicCount > 0 && topicIdsResult.data) {
                const { count: postsCount } = await supabase
                  .from('forum_posts')
                  .select('*', { count: 'exact', head: true })
                  .in('topic_id', topicIdsResult.data.map(t => t.id))
                  .eq('is_deleted', false);
                postCount = postsCount || 0;
              }

              return {
                ...sf,
                topicCount,
                postCount,
              };
            })
          );

          return {
            type: 'subcategory' as const,
            subcategory: {
              ...subcategory,
              category,
            },
            subforum: null,
            subforums: subforumsWithStats,
            parentCategory: category,
          };
        }
      }

      // Nu am găsit nimic
      return {
        type: null,
        subcategory: null,
        subforum: null,
        subforums: [],
        parentCategory: null,
      };
    },
    enabled: !!potentialSlug, // Nu mai necesităm categorySlug
    staleTime: 5 * 60 * 1000, // 5 minute - cache mai lung pentru performanță
    gcTime: 10 * 60 * 1000, // 10 minute - cache mai lung
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

