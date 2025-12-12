import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Trophy, Camera, Eye, Upload, Trash2 } from 'lucide-react';
import { ChangeEvent, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface ProfileSidebarProps {
    user: any;
    profileData: {
        displayName: string;
        email: string;
        username?: string;
    };
    recordsCount: number;
    onLogout: () => Promise<{ error?: any }>;
    onAvatarUpload?: (event: ChangeEvent<HTMLInputElement>) => void;
    onAvatarDelete?: () => void;
    isUploadingAvatar?: boolean;
    avatarUrl?: string | null;
}

export const ProfileSidebar = ({
    user,
    profileData,
    recordsCount,
    onLogout,
    onAvatarUpload,
    onAvatarDelete,
    isUploadingAvatar = false,
    avatarUrl
}: ProfileSidebarProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
        if (onAvatarUpload) {
            onAvatarUpload(event);
        }
        setShowMenu(false);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleDeleteClick = () => {
        if (onAvatarDelete) {
            onAvatarDelete();
        }
        setShowMenu(false);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showMenu]);

    return (
        <div className="lg:col-span-1">
            <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader className="text-center">
                    <div className="relative mx-auto mb-4 avatar-menu-container" ref={menuRef}>
                        {/* Avatar Circle with Border */}
                        <div
                            className="relative w-32 h-32 mx-auto bg-white cursor-pointer group/avatar"
                            style={{
                                borderRadius: '50%',
                                border: '4px solid white',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                            onClick={() => (onAvatarUpload || onAvatarDelete) && setShowMenu(!showMenu)}
                        >
                            {/* Image Container */}
                            <div
                                className="w-full h-full overflow-hidden"
                                style={{ borderRadius: '50%' }}
                            >
                                {avatarUrl || user.user_metadata?.avatar_url ? (
                                    <img
                                        src={avatarUrl || user.user_metadata?.avatar_url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        style={{ borderRadius: '50%' }}
                                        onError={(e) => {
                                            // Hide image if it fails to load
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div
                                        className="w-full h-full bg-slate-100 text-slate-400 font-bold text-4xl flex items-center justify-center"
                                        style={{ borderRadius: '50%' }}
                                        aria-label="Avatar placeholder"
                                    >
                                        {(profileData.displayName?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
                                    </div>
                                )}
                            </div>

                            {/* Hover Overlay */}
                            {(onAvatarUpload || onAvatarDelete) && (
                                <div
                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all pointer-events-none"
                                    style={{ borderRadius: '50%' }}
                                >
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                            )}
                        </div>

                        {/* Menu - Outside Avatar */}
                        {showMenu && (
                            <div
                                className="absolute left-1/2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-[100]"
                                style={{
                                    top: 'calc(100% + 10px)',
                                    transform: 'translateX(-50%)'
                                }}
                            >
                                <div className="py-1">
                                    {onAvatarUpload && (
                                        <button
                                            onClick={handleUploadClick}
                                            disabled={isUploadingAvatar}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Încarcă avatar
                                        </button>
                                    )}
                                    {onAvatarDelete && avatarUrl && (
                                        <button
                                            onClick={handleDeleteClick}
                                            disabled={isUploadingAvatar}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Șterge avatar
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileSelect}
                            disabled={isUploadingAvatar}
                        />
                    </div>
                    <CardTitle className="text-xl dark:text-slate-50">
                        {profileData.displayName || 'Utilizator'}
                    </CardTitle>
                    <CardDescription className="dark:text-slate-400">{user.email}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-slate-300">
                            <Calendar className="w-4 h-4" />
                            <span>Membru din {new Date(user.created_at || Date.now()).toLocaleDateString('ro-RO')}</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-slate-300">
                            <Trophy className="w-4 h-4" />
                            <span>{recordsCount} recorduri</span>
                        </div>
                        {profileData.username && (
                            <Link
                                to={`/profile/${profileData.username}`}
                                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors w-full border border-blue-200 dark:border-blue-800"
                            >
                                <Eye className="w-4 h-4" />
                                Vezi profilul public
                            </Link>
                        )}
                        <Button
                            onClick={async () => {
                                const result = await onLogout();
                                if (result?.error) {
                                    console.error('Logout error:', result.error);
                                }
                                // Use replace instead of href to avoid showing blank page
                                window.location.replace('/');
                            }}
                            variant="outline"
                            className="w-full dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            Ieșire din cont
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
