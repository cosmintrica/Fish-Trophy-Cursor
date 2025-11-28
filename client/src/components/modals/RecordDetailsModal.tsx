import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Fish, MapPin, Calendar, Scale, Ruler, Info } from 'lucide-react';

interface RecordDetailsModalProps {
    record: any;
    isOpen: boolean;
    onClose: () => void;
}

export const RecordDetailsModal = ({ record, isOpen, onClose }: RecordDetailsModalProps) => {
    if (!record) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Fish className="w-6 h-6 text-blue-600" />
                        {record.fish_species?.name || 'Specie necunoscută'}
                    </DialogTitle>
                    <DialogDescription>
                        Adăugat la {new Date(record.created_at).toLocaleDateString('ro-RO')}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* Imagine */}
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                        {record.image_url ? (
                            <img
                                src={record.image_url}
                                alt={record.fish_species?.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Fish className="w-20 h-20 text-gray-300" />
                        )}
                    </div>

                    {/* Detalii */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex items-center gap-2 text-blue-700 mb-1">
                                    <Scale className="w-4 h-4" />
                                    <span className="font-medium">Greutate</span>
                                </div>
                                <p className="text-2xl font-bold text-blue-900">{record.weight} kg</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <div className="flex items-center gap-2 text-green-700 mb-1">
                                    <Ruler className="w-4 h-4" />
                                    <span className="font-medium">Lungime</span>
                                </div>
                                <p className="text-2xl font-bold text-green-900">{record.length_cm} cm</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                                <div>
                                    <p className="font-medium text-gray-900">Locație</p>
                                    <p className="text-gray-600">{record.fishing_locations?.name || 'Locație necunoscută'}</p>
                                    {record.fishing_locations?.county && (
                                        <p className="text-sm text-gray-500">{record.fishing_locations.county}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                                <div>
                                    <p className="font-medium text-gray-900">Data capturii</p>
                                    <p className="text-gray-600">{new Date(record.captured_at).toLocaleDateString('ro-RO')}</p>
                                </div>
                            </div>

                            {record.bait && (
                                <div className="flex items-start gap-3">
                                    <Info className="w-5 h-5 text-gray-500 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-gray-900">Momeală / Tehnică</p>
                                        <p className="text-gray-600">{record.bait}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {record.description && (
                    <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Povestea capturii</h4>
                        <p className="text-gray-600 whitespace-pre-wrap">{record.description}</p>
                    </div>
                )}

                <div className="flex justify-end mt-6">
                    <Button onClick={onClose}>Închide</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
