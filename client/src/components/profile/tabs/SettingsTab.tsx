import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Lock, Mail, Trash2, Save, User } from 'lucide-react';
import { useAccountSettings } from '../hooks/useAccountSettings';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

interface SettingsTabProps {
    user: any;
    isGoogleUser: boolean;
    needsPassword: boolean;
    username?: string;
}

export const SettingsTab = ({ user, isGoogleUser, needsPassword, username }: SettingsTabProps) => {
    const {
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
    } = useAccountSettings(user, isGoogleUser, needsPassword);

    const handleSendEmailVerification = async () => {
        if (!user?.email) return;

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: user.email
            });

            if (error) throw error;
            toast.success('Email de verificare trimis cu succes!');
        } catch (error: any) {
            toast.error(error.message || 'Eroare la trimiterea email-ului');
        }
    };

    const [isChangingUsername, setIsChangingUsername] = useState(false);
    const [usernameData, setUsernameData] = useState({ newUsername: '', confirmUsername: '' });
    const [usernameError, setUsernameError] = useState('');
    const [isChangingUsernameLoading, setIsChangingUsernameLoading] = useState(false);
    const [usernameLastChanged, setUsernameLastChanged] = useState<Date | null>(null);
    const [currentUsername, setCurrentUsername] = useState<string>(username || '');

    // Load username and last changed date
    useEffect(() => {
        if (user?.id) {
            supabase
                .from('profiles')
                .select('username, username_last_changed_at')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    if (data) {
                        if (data.username) {
                            setCurrentUsername(data.username);
                        }
                        if (data.username_last_changed_at) {
                            setUsernameLastChanged(new Date(data.username_last_changed_at));
                        }
                    }
                });
        }
    }, [user?.id, username]);

    const handleUsernameChange = async () => {
        setUsernameError('');
        
        if (!usernameData.newUsername || !usernameData.confirmUsername) {
            setUsernameError('Completează ambele câmpuri');
            return;
        }

        if (usernameData.newUsername !== usernameData.confirmUsername) {
            setUsernameError('Username-urile nu coincid');
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
        if (!usernameRegex.test(usernameData.newUsername)) {
            setUsernameError('Username-ul trebuie să conțină 3-30 caractere (litere, cifre, _ sau -)');
            return;
        }

        // Check if username is already taken
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', usernameData.newUsername.toLowerCase())
            .neq('id', user?.id)
            .single();

        if (existing) {
            setUsernameError('Username-ul este deja folosit');
            return;
        }

        setIsChangingUsernameLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    username: usernameData.newUsername.toLowerCase(),
                    username_last_changed_at: new Date().toISOString()
                })
                .eq('id', user?.id);

            if (error) {
                if (error.message.includes('twice per year')) {
                    setUsernameError('Username-ul poate fi schimbat doar de 2 ori pe an. Ultima schimbare a fost recentă.');
                } else {
                    setUsernameError(error.message);
                }
                return;
            }

            toast.success('Username-ul a fost actualizat cu succes!');
            setIsChangingUsername(false);
            setCurrentUsername(usernameData.newUsername.toLowerCase());
            setUsernameData({ newUsername: '', confirmUsername: '' });
            setUsernameLastChanged(new Date());
        } catch (error: any) {
            setUsernameError(error.message || 'Eroare la actualizare');
        } finally {
            setIsChangingUsernameLoading(false);
        }
    };

    const canChangeUsername = () => {
        if (!usernameLastChanged) return true;
        const daysSinceLastChange = (Date.now() - usernameLastChanged.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastChange >= 182; // 6 months = ~182 days
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Setări cont</h2>

            {/* Secțiunea Username */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Username
                    </CardTitle>
                    <CardDescription>Schimbă username-ul profilului tău public</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <p className="font-medium">@{currentUsername || 'N/A'}</p>
                            {usernameLastChanged && (
                                <p className="text-sm text-gray-500">
                                    Ultima schimbare: {new Date(usernameLastChanged).toLocaleDateString('ro-RO')}
                                </p>
                            )}
                        </div>
                    </div>

                    {!canChangeUsername() && usernameLastChanged && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                <p className="text-yellow-800 font-medium">Limitare schimbare</p>
                            </div>
                            <p className="text-yellow-700 text-sm">
                                Username-ul poate fi schimbat doar de 2 ori pe an. Ultima schimbare a fost pe{' '}
                                {new Date(usernameLastChanged).toLocaleDateString('ro-RO')}. 
                                Poți schimba din nou după 6 luni.
                            </p>
                        </div>
                    )}

                    {!isChangingUsername ? (
                        <Button 
                            variant="outline" 
                            onClick={() => setIsChangingUsername(true)}
                            disabled={!canChangeUsername()}
                        >
                            Schimbă username-ul
                        </Button>
                    ) : (
                        <div className="space-y-4 max-w-md">
                            <div>
                                <Label>Noul username</Label>
                                <Input
                                    type="text"
                                    value={usernameData.newUsername}
                                    onChange={(e) => setUsernameData({ ...usernameData, newUsername: e.target.value })}
                                    placeholder="noul_username"
                                    className={usernameError ? 'border-red-500' : ''}
                                />
                            </div>
                            <div>
                                <Label>Confirmă username-ul</Label>
                                <Input
                                    type="text"
                                    value={usernameData.confirmUsername}
                                    onChange={(e) => setUsernameData({ ...usernameData, confirmUsername: e.target.value })}
                                    placeholder="noul_username"
                                    className={usernameError ? 'border-red-500' : ''}
                                />
                            </div>
                            {usernameError && (
                                <p className="text-red-500 text-sm">{usernameError}</p>
                            )}
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleUsernameChange}
                                    disabled={isChangingUsernameLoading}
                                >
                                    {isChangingUsernameLoading ? 'Se actualizează...' : 'Schimbă username'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setIsChangingUsername(false);
                                        setUsernameData({ newUsername: '', confirmUsername: '' });
                                        setUsernameError('');
                                    }}
                                >
                                    Anulează
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Secțiunea Email */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        Adresă de email
                    </CardTitle>
                    <CardDescription>Gestionează adresa de email asociată contului</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <p className="font-medium">{user?.email}</p>
                            <p className="text-sm text-gray-500">
                                {user?.email_confirmed_at ? (
                                    <span className="text-green-600 flex items-center gap-1">
                                        ✓ Verificat
                                    </span>
                                ) : (
                                    <span className="text-yellow-600 flex items-center gap-1">
                                        ⚠ Neverificat
                                    </span>
                                )}
                            </p>
                        </div>
                        {!user?.email_confirmed_at && (
                            <Button variant="outline" size="sm" onClick={handleSendEmailVerification}>
                                Trimite email verificare
                            </Button>
                        )}
                    </div>

                    {!isGoogleUser && (
                        <div className="pt-4 border-t">
                            {!isChangingEmail ? (
                                <Button variant="outline" onClick={() => setIsChangingEmail(true)}>
                                    Schimbă adresa de email
                                </Button>
                            ) : (
                                <div className="space-y-4 max-w-md">
                                    <div>
                                        <Label>Noua adresă de email</Label>
                                        <Input
                                            type="email"
                                            value={emailData.newEmail}
                                            onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Confirmă noua adresă</Label>
                                        <Input
                                            type="email"
                                            value={emailData.confirmEmail}
                                            onChange={(e) => setEmailData({ ...emailData, confirmEmail: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleEmailChange}
                                            disabled={isChangingEmailLoading}
                                        >
                                            {isChangingEmailLoading ? 'Se trimite...' : 'Schimbă email'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setIsChangingEmail(false);
                                                setEmailData({ newEmail: '', confirmEmail: '' });
                                            }}
                                        >
                                            Anulează
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Secțiunea Securitate */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5" />
                        Securitate
                    </CardTitle>
                    <CardDescription>Actualizează parola contului tău</CardDescription>
                </CardHeader>
                <CardContent>
                    {isGoogleUser && needsPassword ? (
                        // Google Auth user needs to set password first
                        <>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                <div className="flex items-center space-x-2 mb-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    <p className="text-yellow-800 font-medium">Cont Google Auth</p>
                                </div>
                                <p className="text-yellow-700 text-sm">
                                    Te-ai înregistrat cu Google. Pentru a putea schimba parola în viitor, setează o parolă acum.
                                </p>
                            </div>
                            <div className="space-y-4 max-w-md">
                                <div>
                                    <Label htmlFor="newPassword">Parola nouă</Label>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className={`transition-all duration-300 ${passwordErrors.newPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                        placeholder="Parola nouă (min 8 caractere, litere + cifre)"
                                    />
                                    {passwordErrors.newPassword && (
                                        <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="confirmPassword">Confirmă parola nouă</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className={`transition-all duration-300 ${passwordErrors.confirmPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                        placeholder="Confirmă parola nouă"
                                    />
                                    {passwordErrors.confirmPassword && (
                                        <p className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword}</p>
                                    )}
                                </div>
                                <Button onClick={handleSetPasswordForGoogle} className="bg-blue-600 hover:bg-blue-700">
                                    <Save className="w-4 h-4 mr-2" />
                                    Setează parola
                                </Button>
                            </div>
                        </>
                    ) : isGoogleUser ? (
                        // Google Auth user with password already set
                        <>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                <div className="flex items-center space-x-2 mb-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <p className="text-green-800 font-medium">Cont Google Auth</p>
                                </div>
                                <p className="text-green-700 text-sm">
                                    Te-ai înregistrat cu Google și ai o parolă setată. Poți schimba parola folosind formularul de mai jos.
                                </p>
                            </div>
                            {!isChangingPassword ? (
                                <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
                                    <Lock className="w-4 h-4 mr-2" />
                                    Schimbă parola
                                </Button>
                            ) : (
                                <div className="space-y-4 max-w-md">
                                    <div>
                                        <Label htmlFor="currentPassword">Parola actuală</Label>
                                        <Input
                                            id="currentPassword"
                                            type="password"
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                            className={`transition-all duration-300 ${passwordErrors.currentPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                            placeholder="Parola actuală"
                                        />
                                        {passwordErrors.currentPassword && (
                                            <p className="text-red-500 text-sm mt-1">{passwordErrors.currentPassword}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="newPassword">Parola nouă</Label>
                                        <Input
                                            id="newPassword"
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            className={`transition-all duration-300 ${passwordErrors.newPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                            placeholder="Parola nouă (min 8 caractere, litere + cifre)"
                                        />
                                        {passwordErrors.newPassword && (
                                            <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="confirmPassword">Confirmă parola nouă</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            className={`transition-all duration-300 ${passwordErrors.confirmPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                            placeholder="Confirmă parola nouă"
                                        />
                                        {passwordErrors.confirmPassword && (
                                            <p className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword}</p>
                                        )}
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button onClick={handlePasswordChange} className="bg-blue-600 hover:bg-blue-700">
                                            <Save className="w-4 h-4 mr-2" />
                                            Schimbă parola
                                        </Button>
                                        <Button variant="outline" onClick={() => setIsChangingPassword(false)}>
                                            Anulează
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        // Regular email/password user
                        <>
                            {!isChangingPassword ? (
                                <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
                                    <Lock className="w-4 h-4 mr-2" />
                                    Schimbă parola
                                </Button>
                            ) : (
                                <div className="space-y-4 max-w-md">
                                    <div>
                                        <Label htmlFor="currentPassword">Parola actuală</Label>
                                        <Input
                                            id="currentPassword"
                                            type="password"
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                            className={`transition-all duration-300 ${passwordErrors.currentPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                            placeholder="Parola actuală"
                                        />
                                        {passwordErrors.currentPassword && (
                                            <p className="text-red-500 text-sm mt-1">{passwordErrors.currentPassword}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="newPassword">Parola nouă</Label>
                                        <Input
                                            id="newPassword"
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            className={`transition-all duration-300 ${passwordErrors.newPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                            placeholder="Parola nouă (min 8 caractere, litere + cifre)"
                                        />
                                        {passwordErrors.newPassword && (
                                            <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="confirmPassword">Confirmă parola nouă</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            className={`transition-all duration-300 ${passwordErrors.confirmPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                            placeholder="Confirmă parola nouă"
                                        />
                                        {passwordErrors.confirmPassword && (
                                            <p className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword}</p>
                                        )}
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button onClick={handlePasswordChange} className="bg-blue-600 hover:bg-blue-700">
                                            <Save className="w-4 h-4 mr-2" />
                                            Schimbă parola
                                        </Button>
                                        <Button variant="outline" onClick={() => setIsChangingPassword(false)}>
                                            Anulează
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Conturi Conectate */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Conturi conectate
                    </CardTitle>
                    <CardDescription>Gestionează-ți conturile conectate pentru autentificare</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <svg className="w-6 h-6" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                <div>
                                    <p className="font-medium text-gray-900">Google</p>
                                    <p className="text-sm text-gray-600">
                                        {isGoogleUser ? 'Cont conectat' : 'Nu este conectat'}
                                    </p>
                                </div>
                            </div>
                            <div>
                                {isGoogleUser ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        ✓ Conectat
                                    </span>
                                ) : (
                                    <span className="text-gray-500 text-sm">
                                        Nu este conectat
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Preferințe Email */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        Preferințe email
                    </CardTitle>
                    <CardDescription>Gestionează-ți notificările și preferințele de email</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="font-medium">Notificări recorduri</Label>
                                <p className="text-sm text-gray-600">Primești email când recordul tău este verificat</p>
                            </div>
                            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="font-medium">Newsletter</Label>
                                <p className="text-sm text-gray-600">Primești noutăți despre competiții și evenimente</p>
                            </div>
                            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="font-medium">Notificări comunitate</Label>
                                <p className="text-sm text-gray-600">Primești actualizări despre activitatea comunității</p>
                            </div>
                            <input type="checkbox" className="w-4 h-4 text-blue-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Secțiunea Ștergere Cont */}
            <Card className="border-red-200 bg-red-50">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-red-700">
                        <Trash2 className="w-5 h-5" />
                        <span>Ștergere cont</span>
                    </CardTitle>
                    <CardDescription className="text-red-600">
                        Această acțiune este permanentă și nu poate fi anulată
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-red-100 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">!</span>
                                </div>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-red-800 font-medium mb-2">Atenție!</h4>
                                <p className="text-red-700 text-sm mb-3">
                                    Ștergerea contului va elimina permanent:
                                </p>
                                <ul className="text-red-700 text-sm space-y-1 ml-4">
                                    <li>• Toate datele personale și profilul</li>
                                    <li>• Toate recordurile și realizările</li>
                                    <li>• Echipamentele salvate</li>
                                    <li>• Istoricul de activitate</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {!showDeleteConfirm ? (
                        <Button
                            variant="destructive"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Șterge contul
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            {!isGoogleUser && (
                                <div>
                                    <Label htmlFor="deletePassword" className="text-red-700 font-medium">
                                        Confirmă parola pentru a șterge contul
                                    </Label>
                                    <Input
                                        id="deletePassword"
                                        type="password"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        placeholder="Introdu parola contului"
                                        className="mt-2 border-red-300 focus:border-red-500"
                                    />
                                </div>
                            )}
                            <div className="flex space-x-3">
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteAccount}
                                    disabled={isDeletingAccount || (!isGoogleUser && !deletePassword)}
                                    className="flex-1"
                                >
                                    {isDeletingAccount ? (
                                        <>
                                            <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                            Se șterge...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Confirmă ștergerea
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setDeletePassword('');
                                    }}
                                    className="flex-1"
                                >
                                    Anulează
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
