import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Gear {
    id: string;
    brand: string;
    model: string;
    quantity: number;
    purchase_date?: string;
    purchase_price?: number;
    notes?: string;
    description?: string;
    gear_type?: string;
}

interface NewGear {
    gear_type: string;
    brand: string;
    model: string;
    description: string;
    quantity: number;
    purchase_date: string;
    price: number;
}

export const useGear = (userId: string | undefined) => {
    const [userGear, setUserGear] = useState<Gear[]>([]);
    const [isLoadingGear, setIsLoadingGear] = useState(false);
    const [isAddingGear, setIsAddingGear] = useState(false);

    const loadUserGear = useCallback(async () => {
        if (!userId) return;

        setIsLoadingGear(true);
        try {
            const { data, error } = await supabase
                .from('user_gear')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading gear:', error);
                toast.error('Eroare la încărcarea echipamentelor');
                return;
            }

            setUserGear(data || []);
        } catch (error) {
            console.error('Error loading gear:', error);
            toast.error('Eroare la încărcarea echipamentelor');
        } finally {
            setIsLoadingGear(false);
        }
    }, [userId]);

    const addGear = async (newGear: NewGear) => {
        if (!userId) return;

        // Validare câmpuri obligatorii
        if (!newGear.brand.trim()) {
            toast.error('Marca este obligatorie');
            return;
        }
        if (!newGear.model.trim()) {
            toast.error('Modelul este obligatoriu');
            return;
        }
        if (!newGear.quantity || newGear.quantity < 1) {
            toast.error('Cantitatea trebuie să fie cel puțin 1');
            return;
        }

        setIsAddingGear(true);
        try {
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
                .select();

            if (error) {
                console.error('Error adding gear:', error);
                toast.error('Eroare la adăugarea echipamentului');
                return;
            }

            toast.success('Echipamentul a fost adăugat cu succes!');
            await loadUserGear();
            return true;
        } catch (error) {
            console.error('Error adding gear:', error);
            toast.error('Eroare la adăugarea echipamentului');
            return false;
        } finally {
            setIsAddingGear(false);
        }
    };

    const updateGear = async (gearId: string, updatedGear: Partial<NewGear>) => {
        if (!userId) return false;

        // Validare câmpuri obligatorii
        if (updatedGear.brand !== undefined && !updatedGear.brand.trim()) {
            toast.error('Marca este obligatorie');
            return false;
        }
        if (updatedGear.model !== undefined && !updatedGear.model.trim()) {
            toast.error('Modelul este obligatoriu');
            return false;
        }
        if (updatedGear.quantity !== undefined && updatedGear.quantity < 1) {
            toast.error('Cantitatea trebuie să fie cel puțin 1');
            return false;
        }

        try {
            const updateData: any = {};
            if (updatedGear.gear_type !== undefined) updateData.gear_type = updatedGear.gear_type;
            if (updatedGear.brand !== undefined) updateData.brand = updatedGear.brand;
            if (updatedGear.model !== undefined) updateData.model = updatedGear.model;
            if (updatedGear.description !== undefined) updateData.description = updatedGear.description;
            if (updatedGear.quantity !== undefined) updateData.quantity = updatedGear.quantity;
            if (updatedGear.purchase_date !== undefined) updateData.purchase_date = updatedGear.purchase_date || null;
            if (updatedGear.price !== undefined) updateData.purchase_price = updatedGear.price;

            const { error } = await supabase
                .from('user_gear')
                .update(updateData)
                .eq('id', gearId)
                .eq('user_id', userId);

            if (error) {
                console.error('Error updating gear:', error);
                toast.error('Eroare la actualizarea echipamentului');
                return false;
            }

            toast.success('Echipamentul a fost actualizat cu succes!');
            await loadUserGear();
            return true;
        } catch (error) {
            console.error('Error updating gear:', error);
            toast.error('Eroare la actualizarea echipamentului');
            return false;
        }
    };

    const deleteGear = async (gearId: string) => {
        try {
            const { error } = await supabase
                .from('user_gear')
                .delete()
                .eq('id', gearId)
                .eq('user_id', userId);

            if (error) {
                console.error('Error deleting gear:', error);
                toast.error(`Eroare la ștergerea echipamentului: ${error.message}`);
                return;
            }

            toast.success('Echipamentul a fost șters cu succes!');
            loadUserGear();
        } catch (error) {
            console.error('Error deleting gear:', error);
            toast.error('Eroare la ștergerea echipamentului');
        }
    };

    return {
        userGear,
        isLoadingGear,
        isAddingGear,
        loadUserGear,
        addGear,
        updateGear,
        deleteGear
    };
};
