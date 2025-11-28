import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const usePhotoUpload = (userId: string | undefined, onUploadSuccess: () => void) => {
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);

    const uploadPhoto = async (file: File, type: 'avatar' | 'cover') => {
        if (!userId) return;

        // Validare tip fișier
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast.error('Format neacceptat. Folosește JPG, PNG sau WebP.');
            return;
        }

        const isAvatar = type === 'avatar';

        // Validare dimensiune (2MB pentru avatar, 3MB pentru cover)
        const maxSize = isAvatar ? 2 * 1024 * 1024 : 3 * 1024 * 1024;
        if (file.size > maxSize) {
            const maxSizeText = isAvatar ? '2MB' : '3MB';
            toast.error(`Imaginea este prea mare (max ${maxSizeText}).`);
            return;
        }
        if (isAvatar) setIsUploadingAvatar(true);
        else setIsUploadingCover(true);

        const toastId = toast.loading('Se încarcă imaginea...');

        try {
            const bucket = isAvatar ? 'avatars' : 'covers';
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}/${Date.now()}.${fileExt}`;

            // 1. Delete old files first (to prevent duplicates)
            const { data: oldFiles, error: listError } = await supabase.storage
                .from(bucket)
                .list(userId);

            if (!listError && oldFiles && oldFiles.length > 0) {
                const oldFilePaths = oldFiles.map(f => `${userId}/${f.name}`);
                const { error: deleteError } = await supabase.storage
                    .from(bucket)
                    .remove(oldFilePaths);

                if (deleteError) {
                    console.warn('Error deleting old files:', deleteError);
                    // Continue anyway - upload new file
                }
            }

            // 2. Upload new file to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 3. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            // 4. Update profile in database
            const updateData = isAvatar
                ? { photo_url: publicUrl }
                : { cover_photo_url: publicUrl };

            const { error: dbError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', userId);

            if (dbError) throw dbError;

            // 4. Update auth metadata for avatar
            if (isAvatar) {
                const { data: { user: updatedUser } } = await supabase.auth.updateUser({
                    data: { avatar_url: publicUrl }
                });
                // Trigger auth state change to update user in context
                if (updatedUser) {
                    // The auth state change listener will automatically update the user
                    await supabase.auth.refreshSession();
                }
            }

            toast.success('Imagine actualizată cu succes!', { id: toastId });
            onUploadSuccess();
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(`Eroare la încărcare: ${error.message || 'Necunoscută'}`, { id: toastId });
        } finally {
            if (isAvatar) setIsUploadingAvatar(false);
            else setIsUploadingCover(false);
        }
    };

    const deletePhoto = async (type: 'avatar' | 'cover') => {
        if (!userId) return;

        const isAvatar = type === 'avatar';
        const toastId = toast.loading(isAvatar ? 'Se șterge avatarul...' : 'Se șterge coperta...');

        try {
            const bucket = isAvatar ? 'avatars' : 'covers';

            // 1. Get all files for this user in the bucket
            const { data: files, error: listError } = await supabase.storage
                .from(bucket)
                .list(userId);

            if (listError) {
                console.warn('Error listing files:', listError);
                // Continue anyway - maybe folder doesn't exist
            }

            // 2. Delete all files for this user in the bucket
            if (files && files.length > 0) {
                const filePaths = files.map(file => `${userId}/${file.name}`);
                const { error: deleteError } = await supabase.storage
                    .from(bucket)
                    .remove(filePaths);

                if (deleteError) {
                    console.warn('Error deleting files from storage:', deleteError);
                    // Continue anyway - update DB even if storage delete fails
                }
            }

            // 3. Update profile in database (set to null)
            const updateData = isAvatar
                ? { photo_url: null }
                : { cover_photo_url: null };

            const { error: dbError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', userId);

            if (dbError) throw dbError;

            // 4. Update auth metadata for avatar
            if (isAvatar) {
                const { data: { user: updatedUser } } = await supabase.auth.updateUser({
                    data: { avatar_url: null }
                });
                // Trigger auth state change to update user in context
                if (updatedUser) {
                    await supabase.auth.refreshSession();
                }
            }

            toast.success(isAvatar ? 'Avatar șters!' : 'Copertă ștearsă!', { id: toastId });
            onUploadSuccess();
        } catch (error: any) {
            console.error('Delete error:', error);
            toast.error(`Eroare la ștergere: ${error.message || 'Necunoscută'}`, { id: toastId });
        }
    };

    return {
        isUploadingAvatar,
        isUploadingCover,
        uploadPhoto,
        deletePhoto
    };
};
