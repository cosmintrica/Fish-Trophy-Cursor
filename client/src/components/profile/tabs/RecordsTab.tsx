import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Fish, Scale, Ruler, MapPin } from 'lucide-react';
import { getR2ImageUrlProxy } from '@/lib/supabase';

interface RecordsTabProps {
    userId: string;
    isAdmin: boolean;
    records: any[];
    loadingRecords: boolean;
    onShowRecordModal: () => void;
    onViewRecord: (record: any) => void;
    onEditRecord: (record: any) => void;
    onRecordAdded: () => void;
}

export const RecordsTab = ({
    userId,
    isAdmin,
    records,
    loadingRecords,
    onShowRecordModal,
    onViewRecord,
    onEditRecord,
    onRecordAdded
}: RecordsTabProps) => {

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            verified: { label: 'Verificat', className: 'bg-green-100 text-green-800' },
            pending: { label: 'În așteptare', className: 'bg-yellow-100 text-yellow-800' },
            rejected: { label: 'Respins - Editează și trimite din nou', className: 'bg-red-100 text-red-800' }
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
                {config.label}
            </span>
        );
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Recordurile mele</h2>
                {records.length > 0 && (
                    <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={onShowRecordModal}
                    >
                        <Trophy className="w-4 h-4 mr-2" />
                        Adaugă Record
                    </Button>
                )}
            </div>

            {loadingRecords ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Se încarcă recordurile...</p>
                    </CardContent>
                </Card>
            ) : records.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nu ai încă recorduri</h3>
                        <p className="text-gray-600 mb-4">Începe să adaugi recordurile tale de pescuit!</p>
                        <Button onClick={onShowRecordModal}>
                            Adaugă primul record
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {records.map((record) => (
                        <Card key={record.id} className="overflow-hidden">
                            <div className="aspect-video bg-gray-200 relative">
                                {(record.image_url || record.photo_url) ? (
                                    <>
                                        <img
                                            src={getR2ImageUrlProxy(record.image_url || record.photo_url)}
                                            alt={record.fish_species?.name || 'Record'}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                            }}
                                        />
                                        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200" style={{ display: 'none' }}>
                                            <Fish className="w-16 h-16 text-blue-400" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                                        <Fish className="w-16 h-16 text-blue-400" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    {getStatusBadge(record.status)}
                                </div>
                            </div>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-lg">{record.fish_species?.name || 'Specie necunoscută'}</h3>
                                    <span className="text-sm text-gray-500">
                                        {record.date_caught 
                                            ? new Date(record.date_caught).toLocaleDateString('ro-RO')
                                            : record.captured_at 
                                            ? new Date(record.captured_at).toLocaleDateString('ro-RO')
                                            : new Date(record.created_at).toLocaleDateString('ro-RO')}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div className="flex items-center space-x-2">
                                        <Scale className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm">
                                            <span className="font-medium">{record.weight} kg</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Ruler className="w-4 h-4 text-green-600" />
                                        <span className="text-sm">
                                            <span className="font-medium">{(record.length || record.length_cm) || 'N/A'} cm</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                                    <MapPin className="w-4 h-4" />
                                    <span>{record.fishing_locations?.name || 'Locație necunoscută'}</span>
                                </div>

                                <div className="flex space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => onViewRecord(record)}
                                    >
                                        Vezi detalii
                                    </Button>
                                    {record.status === 'pending' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => onEditRecord(record)}
                                        >
                                            Editează
                                        </Button>
                                    )}
                                    {record.status === 'rejected' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-red-600 border-red-300"
                                            onClick={() => onEditRecord(record)}
                                        >
                                            Editează și trimite din nou
                                        </Button>
                                    )}
                                    {isAdmin && record.status === 'verified' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-orange-600 border-orange-300"
                                            onClick={() => onEditRecord(record)}
                                        >
                                            Editează (Admin)
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </>
    );
};
