import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function ForumSeeder() {
    const [status, setStatus] = useState<'idle' | 'checking' | 'seeding' | 'done' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        checkAndSeed();
    }, []);

    const checkAndSeed = async () => {
        try {
            setStatus('checking');
            setMessage('Verific datele forumului...');

            // Check if categories exist
            const { count, error } = await supabase
                .from('forum_categories')
                .select('*', { count: 'exact', head: true });

            if (error) throw error;

            if (count === 0) {
                setStatus('seeding');
                setMessage('Baza de date este goală. Se populează categoriile...');
                await seedCategories();
                setStatus('done');
                setMessage('Datele au fost populate cu succes! Reîmprospătează pagina.');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                setStatus('idle'); // Data exists, do nothing
            }
        } catch (err: any) {
            console.error('Seeding error:', err);
            setStatus('error');
            setMessage(`Eroare la verificare: ${err.message}`);
        }
    };

    const seedCategories = async () => {
        // 1. Create Main Categories
        const mainCategories = [
            { slug: 'pescuit-crap', name: 'Pescuit la Crap', description: 'Totul despre pescuitul la crap', sort_order: 1, icon: '🐟' },
            { slug: 'pescuit-rapitor', name: 'Pescuit la Răpitor', description: 'Spinning, casting și alte tehnici', sort_order: 2, icon: '🎣' },
            { slug: 'pescuit-stationar', name: 'Pescuit Staționar', description: 'Feeder, match, vargă', sort_order: 3, icon: '🪑' },
            { slug: 'echipament', name: 'Echipament și Accesorii', description: 'Discuții despre scule de pescuit', sort_order: 4, icon: '🎒' },
            { slug: 'locatii', name: 'Locații de Pescuit', description: 'Bălți, lacuri, râuri', sort_order: 5, icon: '🗺️' },
            { slug: 'comunitate', name: 'Comunitate', description: 'Discuții generale și evenimente', sort_order: 6, icon: '👥' }
        ];

        for (const cat of mainCategories) {
            const { data, error } = await supabase
                .from('forum_categories')
                .insert(cat)
                .select()
                .single();

            if (error) throw error;

            // Create subcategories for this category
            if (cat.slug === 'pescuit-crap') {
                await createSubcategories(data.id, [
                    { name: 'Tehnici și Tactici', description: 'Strategii de pescuit la crap', sort_order: 1 },
                    { name: 'Momeli și Nade', description: 'Boiles, pelete, semințe', sort_order: 2 },
                    { name: 'Monturi', description: 'Prezentări și noduri', sort_order: 3 }
                ]);
            } else if (cat.slug === 'pescuit-rapitor') {
                await createSubcategories(data.id, [
                    { name: 'Spinning', description: 'Pescuit la spinning', sort_order: 1 },
                    { name: 'Casting', description: 'Pescuit la casting', sort_order: 2 },
                    { name: 'Naluci', description: 'Voblere, gume, linguri', sort_order: 3 }
                ]);
            }
            else if (cat.slug === 'pescuit-stationar') {
                await createSubcategories(data.id, [
                    { name: 'Feeder', description: 'Pescuit la feeder', sort_order: 1 },
                    { name: 'Match', description: 'Pescuit la match', sort_order: 2 },
                    { name: 'Vargă', description: 'Pescuit la vargă', sort_order: 3 }
                ]);
            }
            else if (cat.slug === 'echipament') {
                await createSubcategories(data.id, [
                    { name: 'Lansete', description: 'Discuții despre lansete', sort_order: 1 },
                    { name: 'Mulinete', description: 'Discuții despre mulinete', sort_order: 2 },
                    { name: 'Fire și Accesorii', description: 'Fire, cârlige, plumbi', sort_order: 3 }
                ]);
            }
            else if (cat.slug === 'locatii') {
                await createSubcategories(data.id, [
                    { name: 'Bălți Private', description: 'Lacuri cu taxă', sort_order: 1 },
                    { name: 'Ape Publice', description: 'Râuri și lacuri naturale', sort_order: 2 },
                    { name: 'Delta Dunării', description: 'Pescuit în Deltă', sort_order: 3 }
                ]);
            }
            else if (cat.slug === 'comunitate') {
                await createSubcategories(data.id, [
                    { name: 'Discuții Generale', description: 'Orice nu intră în alte categorii', sort_order: 1 },
                    { name: 'Concursuri', description: 'Competiții și evenimente', sort_order: 2 },
                    { name: 'Anunțuri Administrative', description: 'Noutăți despre forum', sort_order: 3 }
                ]);
            }
        }
    };

    const createSubcategories = async (parentId: string, subs: any[]) => {
        const subcategories = subs.map(s => ({
            ...s,
            parent_id: parentId,
            slug: s.name.toLowerCase().replace(/ /g, '-').replace(/ă/g, 'a').replace(/â/g, 'a').replace(/î/g, 'i').replace(/ș/g, 's').replace(/ț/g, 't')
        }));

        const { error } = await supabase
            .from('forum_categories')
            .insert(subcategories);

        if (error) throw error;
    };

    if (status === 'idle') return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '1rem',
            right: '1rem',
            backgroundColor: status === 'error' ? '#fee2e2' : '#dbeafe',
            color: status === 'error' ? '#991b1b' : '#1e40af',
            padding: '1rem',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 100,
            maxWidth: '300px'
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                {status === 'checking' && '🔍 Verificare...'}
                {status === 'seeding' && '🌱 Populare...'}
                {status === 'done' && '✅ Gata!'}
                {status === 'error' && '❌ Eroare'}
            </div>
            <div style={{ fontSize: '0.875rem' }}>{message}</div>
        </div>
    );
}
