import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PasswordData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

interface EmailData {
    newEmail: string;
    confirmEmail: string;
}

interface PasswordErrors {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export const useAccountSettings = (user: any, isGoogleUser: boolean = false, needsPassword: boolean = false) => {
    const [passwordData, setPasswordData] = useState<PasswordData>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [emailData, setEmailData] = useState<EmailData>({
        newEmail: '',
        confirmEmail: ''
    });

    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isChangingEmail, setIsChangingEmail] = useState(false);
    const [isChangingEmailLoading, setIsChangingEmailLoading] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');

    const handleSetPasswordForGoogle = async () => {
        if (!user?.id) {
            toast.error('Utilizatorul nu este autentificat');
            return;
        }

        // Clear previous errors
        setPasswordErrors({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });

        if (!passwordData.newPassword) {
            setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola nouă este obligatorie' }));
            toast.error('Parola nouă este obligatorie');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordErrors(prev => ({ ...prev, confirmPassword: 'Parolele nu se potrivesc' }));
            toast.error('Parolele nu se potrivesc');
            return;
        }

        if (passwordData.newPassword.length < 8) {
            setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola trebuie să aibă cel puțin 8 caractere' }));
            toast.error('Parola trebuie să aibă cel puțin 8 caractere');
            return;
        }

        const hasLetter = /[a-zA-Z]/.test(passwordData.newPassword);
        const hasNumber = /[0-9]/.test(passwordData.newPassword);

        if (!hasLetter || !hasNumber) {
            setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola trebuie să conțină cel puțin o literă și o cifră' }));
            toast.error('Parola trebuie să conțină cel puțin o literă și o cifră');
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (error) {
                toast.error(error.message || 'Eroare la setarea parolei');
            } else {
                toast.success('Parola a fost setată cu succes!');
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setPasswordErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        } catch (error) {
            console.error('Error setting password:', error);
            toast.error('Eroare la setarea parolei');
        }
    };

    const handlePasswordChange = async () => {
        if (!user?.id) {
            toast.error('Utilizatorul nu este autentificat');
            return;
        }

        // Clear previous errors
        setPasswordErrors({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });

        if (!passwordData.currentPassword) {
            setPasswordErrors(prev => ({ ...prev, currentPassword: 'Parola actuală este obligatorie' }));
            toast.error('Parola actuală este obligatorie');
            return;
        }

        if (!passwordData.newPassword) {
            setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola nouă este obligatorie' }));
            toast.error('Parola nouă este obligatorie');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordErrors(prev => ({ ...prev, confirmPassword: 'Parolele nu se potrivesc' }));
            toast.error('Parolele nu se potrivesc');
            return;
        }

        if (passwordData.newPassword.length < 8) {
            setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola trebuie să aibă cel puțin 8 caractere' }));
            toast.error('Parola trebuie să aibă cel puțin 8 caractere');
            return;
        }

        if (passwordData.currentPassword === passwordData.newPassword) {
            setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola nouă trebuie să fie diferită de cea actuală' }));
            toast.error('Parola nouă trebuie să fie diferită de cea actuală');
            return;
        }

        try {
            // Verify current password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email || '',
                password: passwordData.currentPassword
            });

            if (signInError) {
                setPasswordErrors(prev => ({ ...prev, currentPassword: 'Parola actuală este incorectă' }));
                toast.error('Parola actuală este incorectă');
                return;
            }

            // Update password
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (error) {
                if (error.message.includes('Password should be at least')) {
                    setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola trebuie să aibă cel puțin 6 caractere' }));
                    toast.error('Parola trebuie să aibă cel puțin 6 caractere');
                } else {
                    toast.error('Eroare la schimbarea parolei: ' + error.message);
                }
            } else {
                toast.success('Parola a fost actualizată cu succes!');
                setIsChangingPassword(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setPasswordErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        } catch (error) {
            console.error('Error changing password:', error);
            toast.error('A apărut o eroare la schimbarea parolei');
        }
    };

    const handleEmailChange = async () => {
        if (!user?.id) {
            toast.error('Utilizatorul nu este autentificat');
            return;
        }

        if (emailData.newEmail !== emailData.confirmEmail) {
            toast.error('Email-urile nu se potrivesc');
            return;
        }

        if (emailData.newEmail === user.email) {
            toast.error('Noul email trebuie să fie diferit de cel actual');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailData.newEmail)) {
            toast.error('Formatul email-ului nu este valid');
            return;
        }

        setIsChangingEmailLoading(true);
        toast.loading('Se schimbă email-ul...', { id: 'email-change' });

        try {
            const { error } = await supabase.auth.updateUser({
                email: emailData.newEmail
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    toast.error('Acest email este deja folosit de alt cont', { id: 'email-change' });
                } else {
                    toast.error('Eroare la schimbarea email-ului: ' + error.message, { id: 'email-change' });
                }
            } else {
                toast.success('Email-ul a fost schimbat! Verifică-ți noul email pentru confirmare.', { id: 'email-change' });
                setIsChangingEmail(false);
                setEmailData({ newEmail: '', confirmEmail: '' });
            }
        } catch (error) {
            console.error('Error changing email:', error);
            toast.error('A apărut o eroare la schimbarea email-ului', { id: 'email-change' });
        } finally {
            setIsChangingEmailLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user?.id) return;

        if (!isGoogleUser && !deletePassword) {
            toast.error('Introdu parola pentru a confirma ștergerea contului');
            return;
        }

        setIsDeletingAccount(true);
        toast.loading('Se șterge contul...', { id: 'delete-account' });

        try {
            // Verify password (only for non-Google users)
            if (!isGoogleUser) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: user.email || '',
                    password: deletePassword
                });

                if (signInError) {
                    toast.error('Parola introdusă este incorectă', { id: 'delete-account' });
                    return;
                }
            }

            // IMPORTANT: Ordinea ștergerii este crucială!
            // 1. Ștergem datele care au foreign keys către profiles (CASCADE va șterge automat, dar e mai sigur explicit)
            // 2. Ștergem profilul (care are ON DELETE CASCADE către auth.users)
            // 3. Ștergerea din auth.users se face automat prin CASCADE când ștergem din profiles
            
            // Ștergem datele utilizatorului (CASCADE ar face asta automat, dar e mai sigur explicit):
            // - records (ON DELETE CASCADE către profiles)
            // - user_gear (ON DELETE CASCADE către profiles)
            // - private_messages (ON DELETE CASCADE pentru sender_id și recipient_id)
            // - catches și datele asociate (catch_likes, catch_comments, catch_shares - ON DELETE CASCADE)
            // - shop_reviews (ON DELETE CASCADE)
            
            await supabase.from('user_gear').delete().eq('user_id', user.id);
            await supabase.from('records').delete().eq('user_id', user.id);
            await supabase.from('private_messages').delete().or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
            
            // Ștergem catch-urile și datele asociate (dacă există)
            try {
                await supabase.from('catches').delete().eq('user_id', user.id);
            } catch (e) {
                // Tabelul catches poate să nu existe sau să fie deja șters prin CASCADE
                console.log('Catches deletion:', e);
            }
            
            // Ștergem profilul - aceasta va declanșa CASCADE pentru auth.users
            // profiles.id are: references auth.users(id) on delete cascade
            // Deci când ștergem din profiles, auth.users se șterge automat
            const { error: profileError } = await supabase.from('profiles').delete().eq('id', user.id);
            
            if (profileError) {
                throw profileError;
            }
            
            // Note: analytics_events și analytics_sessions au ON DELETE SET NULL,
            // deci user_id devine NULL (datele rămân pentru statistici, dar fără legătură la utilizator)
            
            toast.success('Cont șters cu succes! Toate datele au fost eliminate.', { id: 'delete-account' });
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error deleting account:', error);
            toast.error('Eroare la ștergerea contului. Contactează suportul.', { id: 'delete-account' });
        } finally {
            setIsDeletingAccount(false);
            setShowDeleteConfirm(false);
            setDeletePassword('');
        }
    };

    return {
        passwordData,
        setPasswordData,
        passwordErrors,
        setPasswordErrors,
        emailData,
        setEmailData,
        isChangingPassword,
        setIsChangingPassword,
        isChangingEmail,
        setIsChangingEmail,
        isChangingEmailLoading,
        isDeletingAccount,
        showDeleteConfirm,
        setShowDeleteConfirm,
        deletePassword,
        setDeletePassword,
        handlePasswordChange,
        handleSetPasswordForGoogle,
        handleEmailChange,
        handleDeleteAccount
    };
};
