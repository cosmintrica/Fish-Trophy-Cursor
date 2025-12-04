/**
 * User Gear Hook
 * Manages user gear data using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface Gear {
    id: string
    brand: string
    model: string
    quantity: number
    purchase_date?: string
    purchase_price?: number
    notes?: string
    description?: string
    gear_type?: string
}

interface NewGear {
    gear_type: string
    brand: string
    model: string
    description: string
    quantity: number
    purchase_date: string
    price: number
}

export const useGear = (userId: string | undefined) => {
    const queryClient = useQueryClient()
    const queryKey = userId ? ['gear', userId] : null

    // Query pentru gear
    const { data: userGear = [], isLoading: isLoadingGear, refetch: loadUserGear } = useQuery<Gear[]>({
        queryKey: queryKey || ['gear', 'disabled'],
        queryFn: async () => {
            if (!userId) {
                throw new Error('User ID is required')
            }
            const { data, error } = await supabase
                .from('user_gear')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error loading gear:', error)
                toast.error('Eroare la încărcarea echipamentelor')
                throw error
            }

            return data || []
        },
        enabled: !!queryKey,
        staleTime: 2 * 60 * 1000, // 2 minute
        gcTime: 5 * 60 * 1000, // 5 minute
        refetchOnWindowFocus: false,
    })

    // Mutation pentru add gear
    const addGearMutation = useMutation({
        mutationFn: async (newGear: NewGear) => {
            if (!userId) throw new Error('User ID is required')

            // Validare
            if (!newGear.brand.trim()) {
                throw new Error('Marca este obligatorie')
            }
            if (!newGear.model.trim()) {
                throw new Error('Modelul este obligatoriu')
            }
            if (!newGear.quantity || newGear.quantity < 1) {
                throw new Error('Cantitatea trebuie să fie cel puțin 1')
            }

            const { error } = await supabase
                .from('user_gear')
                .insert({
                    user_id: userId,
                    gear_type: newGear.gear_type,
                    brand: newGear.brand,
                    model: newGear.model,
                    description: newGear.description,
                    quantity: newGear.quantity,
                    purchase_date: newGear.purchase_date || null,
                    purchase_price: newGear.price
                })

            if (error) {
                console.error('Error adding gear:', error)
                throw new Error('Eroare la adăugarea echipamentului')
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gear', userId] })
            toast.success('Echipamentul a fost adăugat cu succes!')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Eroare la adăugarea echipamentului')
        },
    })

    // Mutation pentru update gear
    const updateGearMutation = useMutation({
        mutationFn: async ({ gearId, updatedGear }: { gearId: string; updatedGear: Partial<NewGear> }) => {
            if (!userId) throw new Error('User ID is required')

            // Validare
            if (updatedGear.brand !== undefined && !updatedGear.brand.trim()) {
                throw new Error('Marca este obligatorie')
            }
            if (updatedGear.model !== undefined && !updatedGear.model.trim()) {
                throw new Error('Modelul este obligatoriu')
            }
            if (updatedGear.quantity !== undefined && updatedGear.quantity < 1) {
                throw new Error('Cantitatea trebuie să fie cel puțin 1')
            }

            const updateData: any = {}
            if (updatedGear.gear_type !== undefined) updateData.gear_type = updatedGear.gear_type
            if (updatedGear.brand !== undefined) updateData.brand = updatedGear.brand
            if (updatedGear.model !== undefined) updateData.model = updatedGear.model
            if (updatedGear.description !== undefined) updateData.description = updatedGear.description
            if (updatedGear.quantity !== undefined) updateData.quantity = updatedGear.quantity
            if (updatedGear.purchase_date !== undefined) updateData.purchase_date = updatedGear.purchase_date || null
            if (updatedGear.price !== undefined) updateData.purchase_price = updatedGear.price

            const { error } = await supabase
                .from('user_gear')
                .update(updateData)
                .eq('id', gearId)
                .eq('user_id', userId)

            if (error) {
                console.error('Error updating gear:', error)
                throw new Error('Eroare la actualizarea echipamentului')
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gear', userId] })
            toast.success('Echipamentul a fost actualizat cu succes!')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Eroare la actualizarea echipamentului')
        },
    })

    // Mutation pentru delete gear
    const deleteGearMutation = useMutation({
        mutationFn: async (gearId: string) => {
            if (!userId) throw new Error('User ID is required')

            const { error } = await supabase
                .from('user_gear')
                .delete()
                .eq('id', gearId)
                .eq('user_id', userId)

            if (error) {
                console.error('Error deleting gear:', error)
                throw new Error(`Eroare la ștergerea echipamentului: ${error.message}`)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gear', userId] })
            toast.success('Echipamentul a fost șters cu succes!')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Eroare la ștergerea echipamentului')
        },
    })

    const addGear = async (newGear: NewGear) => {
        try {
            await addGearMutation.mutateAsync(newGear)
            return true
        } catch {
            return false
        }
    }

    const updateGear = async (gearId: string, updatedGear: Partial<NewGear>) => {
        try {
            await updateGearMutation.mutateAsync({ gearId, updatedGear })
            return true
        } catch {
            return false
        }
    }

    const deleteGear = async (gearId: string) => {
        await deleteGearMutation.mutateAsync(gearId)
    }

    return {
        userGear,
        isLoadingGear,
        isAddingGear: addGearMutation.isPending,
        loadUserGear: () => loadUserGear(),
        addGear,
        updateGear,
        deleteGear
    }
}
