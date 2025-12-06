/**
 * Hook pentru preloading agresiv pe homepage
 * Preîncarcă datele esențiale în background pentru experiență instant
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-client';
import { getTopics } from '../../services/forum';
import type { CategoryWithChildren } from '../../services/forum/types';

/**
 * Hook pentru preloading agresiv - se execută pe homepage
 * Preîncarcă subcategoriile și primele topicuri în background
 */
export function useAggressivePreload(categories: CategoryWithChildren[] | undefined, loading: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Nu facem preloading dacă categoriile se încarcă încă sau nu sunt disponibile
    if (loading || !categories || categories.length === 0) {
      if (loading) {
        console.log('⏳ [PRELOAD] Waiting for categories to load...');
      } else {
        console.log('🚫 [PRELOAD] Skipped:', { loading, hasCategories: !!categories, count: categories?.length || 0 });
      }
      return;
    }

    console.log('🚀 [PRELOAD] Starting aggressive preloading for', categories.length, 'categories');
    console.log('📊 [PRELOAD] Categories structure:', categories.map(c => ({
      name: c.name,
      subcategories: c.subcategories?.length || 0,
      subforums: c.subforums?.length || 0,
      subforumsInSubcats: c.subcategories?.reduce((sum, sc) => sum + (sc.subforums?.length || 0), 0) || 0
    })));

    // Preloading agresiv: prefetch subcategoriile și primele topicuri
    const preloadData = async () => {
      // Prefetch pentru fiecare categorie (în paralel, dar limitat pentru a nu suprasolicita)
      const preloadPromises: Promise<void>[] = [];
      let preloadCount = 0;

      for (const category of categories.slice(0, 10)) { // Limitez la primele 10 categorii
        // Prefetch subcategoriile (primele 5 topicuri din fiecare subcategorie)
        if (category.subcategories && category.subcategories.length > 0) {
          for (const subcategory of category.subcategories.slice(0, 5)) { // Primele 5 subcategorii
            if (subcategory.id) {
              // Prefetch topicurile subcategoriei (folosim pageSize 50 pentru a se potrivi cu CategoryPage)
              const queryKey = queryKeys.topics(subcategory.id, 1, 50, 'subcategory');
              
              // Verifică dacă datele sunt deja în cache
              const cachedData = queryClient.getQueryData(queryKey);
              if (!cachedData) {
                preloadCount++;
                preloadPromises.push(
                  queryClient.prefetchQuery({
                    queryKey,
                    queryFn: async () => {
                      console.log('📥 Preloading topics for subcategory:', subcategory.name);
                      const result = await getTopics(subcategory.id!, 1, 50);
                      if (result.error) {
                        throw new Error(result.error.message);
                      }
                      console.log('✅ Preloaded', result.data?.data?.length || 0, 'topics for subcategory:', subcategory.name);
                      return result.data!;
                    },
                    staleTime: 5 * 60 * 1000, // 5 minute
                  }).then(() => {
                    preloadCount--;
                  })
                );
              }

              // IMPORTANT: Prefetch și subforumurile din subcategorii
              if (subcategory.subforums && subcategory.subforums.length > 0) {
                for (const subforum of subcategory.subforums.slice(0, 3)) { // Primele 3 subforumuri din fiecare subcategorie
                  if (subforum.id) {
                    const subforumQueryKey = queryKeys.topics(subforum.id, 1, 50, 'subforum');
                    
                    const subforumCachedData = queryClient.getQueryData(subforumQueryKey);
                    if (!subforumCachedData) {
                      preloadCount++;
                      preloadPromises.push(
                        queryClient.prefetchQuery({
                          queryKey: subforumQueryKey,
                          queryFn: async () => {
                            console.log('📥 Preloading topics for subforum:', subforum.name, 'in subcategory:', subcategory.name);
                            const result = await getTopics(undefined, 1, 50, subforum.id!);
                            if (result.error) {
                              throw new Error(result.error.message);
                            }
                            console.log('✅ Preloaded', result.data?.data?.length || 0, 'topics for subforum:', subforum.name);
                            return result.data!;
                          },
                          staleTime: 5 * 60 * 1000,
                        }).then(() => {
                          preloadCount--;
                        })
                      );
                    }
                  }
                }
              }
            }
          }
        }

        // Prefetch subforumurile directe din categorie (dacă există - legacy)
        if (category.subforums && category.subforums.length > 0) {
          for (const subforum of category.subforums.slice(0, 5)) { // Primele 5 subforumuri
            if (subforum.id) {
              const queryKey = queryKeys.topics(subforum.id, 1, 50, 'subforum');
              
              const cachedData = queryClient.getQueryData(queryKey);
              if (!cachedData) {
                preloadCount++;
                preloadPromises.push(
                  queryClient.prefetchQuery({
                    queryKey,
                    queryFn: async () => {
                      console.log('📥 Preloading topics for direct subforum:', subforum.name);
                      const result = await getTopics(undefined, 1, 50, subforum.id!);
                      if (result.error) {
                        throw new Error(result.error.message);
                      }
                      console.log('✅ Preloaded', result.data?.data?.length || 0, 'topics for direct subforum:', subforum.name);
                      return result.data!;
                    },
                    staleTime: 5 * 60 * 1000,
                  }).then(() => {
                    preloadCount--;
                  })
                );
              }
            }
          }
        }
      }

      console.log('📦 Total preload promises:', preloadPromises.length);

      // Execută preloading-ul în batch-uri pentru a nu suprasolicita
      const batchSize = 5;
      for (let i = 0; i < preloadPromises.length; i += batchSize) {
        const batch = preloadPromises.slice(i, i + batchSize);
        await Promise.all(batch);
        console.log(`✅ Completed batch ${Math.floor(i / batchSize) + 1}, remaining: ${preloadPromises.length - i - batchSize}`);
        // Mic delay între batch-uri pentru a nu blocă UI-ul
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('🎉 Preloading completed!');
    };

    // Rulează preloading-ul în background (nu blocăm UI-ul)
    preloadData().catch(error => {
      console.error('❌ Preloading error:', error);
    });
  }, [categories, loading, queryClient]);
}

