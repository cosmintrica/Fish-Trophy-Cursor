import { Fish, MapPin, Scale, Ruler, Play, Trophy, User, CheckCircle } from 'lucide-react';
import { getR2ImageUrlProxy } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import ShareButton from '@/components/ShareButton';

interface RecordCardProps {
    record: any;
    rank: number;
    onOpenModal: (record: any) => void;
    onOpenProfile: (record: any) => void;
    onPrefetchProfile: (username: string | undefined, userId: string | undefined) => void;
    variant?: 'card' | 'list';
}

const RecordCard = ({ record, rank, onOpenModal, onOpenProfile, onPrefetchProfile, variant = 'card' }: RecordCardProps) => {
    const imageUrl = record.photo_url || record.image_url;
    const videoUrl = record.video_url;

    const getRankBadge = (rank: number) => {
        if (variant === 'list') {
            const baseClasses = "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shadow-sm";
            if (rank === 1) return <div className={`${baseClasses} bg-gradient-to-br from-yellow-400 to-yellow-600 text-white`}>1</div>;
            if (rank === 2) return <div className={`${baseClasses} bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800`}>2</div>;
            if (rank === 3) return <div className={`${baseClasses} bg-gradient-to-br from-amber-600 to-amber-700 text-white`}>3</div>;
            return <div className={`${baseClasses} bg-slate-100 dark:bg-slate-700 text-slate-500`}>{rank}</div>;
        }

        const baseClasses = "absolute top-3 left-3 w-10 h-10 flex items-center justify-center rounded-lg font-bold text-lg shadow-lg z-10 backdrop-blur-sm border";
        if (rank === 1) return <div className={`${baseClasses} bg-yellow-400/90 text-yellow-900 border-yellow-200`}>1</div>;
        if (rank === 2) return <div className={`${baseClasses} bg-slate-300/90 text-slate-800 border-slate-200`}>2</div>;
        if (rank === 3) return <div className={`${baseClasses} bg-amber-600/90 text-amber-100 border-amber-500`}>3</div>;
        return <div className={`${baseClasses} bg-slate-800/80 text-white border-slate-700`}>{rank}</div>;
    };

    if (variant === 'list') {
        return (
            <div
                className="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all duration-200 cursor-pointer"
                onClick={() => onOpenModal(record)}
            >
                <div className="flex items-center p-3 gap-3 sm:gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0">
                        {getRankBadge(rank)}
                    </div>

                    {/* Image (Small Thumbnail) */}
                    <div
                        className="relative w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-pointer"
                        onClick={() => onOpenModal(record)}
                    >
                        {imageUrl ? (
                            <img
                                src={getR2ImageUrlProxy(imageUrl)}
                                alt={record.fish_species?.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Fish className="w-6 h-6" />
                            </div>
                        )}
                        {videoUrl && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <Play className="w-4 h-4 text-white fill-white" />
                            </div>
                        )}
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3
                                className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate group-hover:text-blue-600 transition-colors cursor-pointer"
                                onClick={() => onOpenModal(record)}
                            >
                                {record.fish_species?.name || 'Specie Necunoscută'}
                            </h3>
                            {record.status === 'verified' && (
                                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                            <span className="truncate max-w-[120px] sm:max-w-xs">{record.fishing_locations?.name}</span>
                            <span className="hidden sm:inline opacity-50">•</span>
                            <span className="hidden sm:inline text-gray-400 dark:text-slate-500">
                                {new Date(record.captured_at || record.created_at).toLocaleDateString('ro-RO')}
                            </span>
                        </div>
                    </div>

                    {/* Stats (Compact) */}
                    <div className="flex flex-col items-end gap-0.5 sm:gap-1 px-2 sm:px-4 border-l border-r border-gray-100 dark:border-slate-700/50">
                        <div className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            {record.weight} <span className="text-xs font-normal opacity-70">kg</span>
                        </div>
                        {record.length_cm && (
                            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                {record.length_cm} <span className="opacity-70">cm</span>
                            </div>
                        )}
                    </div>

                    {/* User Avatar */}
                    <div
                        className="flex-shrink-0 pl-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenProfile(record);
                        }}
                        onMouseEnter={() => onPrefetchProfile(record.profiles?.username, record.user_id)}
                    >
                        {record.profiles?.photo_url ? (
                            <img
                                src={getR2ImageUrlProxy(record.profiles.photo_url)}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 cursor-pointer hover:ring-blue-500 transition-colors"
                                alt={record.profiles?.display_name}
                                title={record.profiles?.display_name}
                            />
                        ) : (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
                                <User className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700/60 shadow-sm hover:shadow-xl hover:border-blue-500/30 dark:hover:border-blue-400/30 transition-all duration-300 cursor-pointer h-full"
            onClick={() => onOpenModal(record)}
        >
            <div className="flex flex-col sm:flex-row h-full">
                {/* Media Section */}
                <div
                    className="relative sm:w-48 h-48 sm:h-auto overflow-hidden cursor-pointer bg-slate-100 dark:bg-slate-900"
                    onClick={() => onOpenModal(record)}
                >
                    {imageUrl ? (
                        <img
                            src={getR2ImageUrlProxy(imageUrl)}
                            alt={record.fish_species?.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                        />
                    ) : videoUrl ? (
                        <video
                            src={getR2ImageUrlProxy(videoUrl)}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                            <Fish className="w-12 h-12" />
                        </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 sm:opacity-40 transition-opacity" />

                    {getRankBadge(rank)}

                    {videoUrl && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50 group-hover:scale-110 transition-transform">
                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden">
                    {/* Ambient Background Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

                    <div>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer" onClick={() => onOpenModal(record)}>
                                    {record.fish_species?.name || 'Specie Necunoscută'}
                                </h3>
                                <div className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span className="truncate max-w-[200px]">{record.fishing_locations?.name || 'Locație necunoscută'}</span>
                                </div>
                            </div>

                            {record.status === 'verified' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/30 uppercase tracking-wide">
                                    Verificat
                                </span>
                            )}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-2.5 border border-blue-100 dark:border-blue-500/20">
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                                    <Scale className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Greutate</span>
                                </div>
                                <div className="text-lg font-black text-blue-900 dark:text-blue-100">
                                    {record.weight} <span className="text-sm font-medium opacity-70">kg</span>
                                </div>
                            </div>

                            <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-2.5 border border-emerald-100 dark:border-emerald-500/20">
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                                    <Ruler className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Lungime</span>
                                </div>
                                <div className="text-lg font-black text-emerald-900 dark:text-emerald-100">
                                    {record.length_cm || record.length || '-'} <span className="text-sm font-medium opacity-70">cm</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 dark:border-slate-700/50">
                        <div
                            className="flex items-center gap-2 group/user cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenProfile(record);
                            }}
                            onMouseEnter={() => onPrefetchProfile(record.profiles?.username, record.user_id)}
                        >
                            <div className="relative">
                                {record.profiles?.photo_url ? (
                                    <img
                                        src={getR2ImageUrlProxy(record.profiles.photo_url)}
                                        className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-slate-700 group-hover/user:ring-blue-500 transition-colors"
                                        alt={record.profiles?.display_name}
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center ring-2 ring-white dark:ring-slate-700 group-hover/user:ring-blue-500 transition-colors">
                                        <User className="w-4 h-4 text-slate-500" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 dark:text-slate-500 font-medium">Pescar</div>
                                <div className="text-sm font-bold text-gray-900 dark:text-slate-200 group-hover/user:text-blue-500 transition-colors">
                                    {record.profiles?.display_name || 'Anonymous'}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="scale-90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300" onClick={(e) => e.stopPropagation()}>
                                <ShareButton
                                    url={`https://fishtrophy.ro/records${record.global_id ? `#record-${record.global_id}` : `?record=${record.id}`}`}
                                    title={`${record.fish_species?.name} - ${record.weight}kg`}
                                    description={`Record ${record.fishing_locations?.name}`}
                                    image={imageUrl ? getR2ImageUrlProxy(imageUrl) : ''}
                                    size="sm"
                                    variant="ghost"
                                />
                            </div>
                            <button
                                onClick={() => onOpenModal(record)}
                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-blue-600 dark:hover:bg-blue-400 dark:hover:text-white transition-colors shadow-lg shadow-blue-500/20"
                            >
                                Vezi Detalii
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecordCard;
