import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wrench, Fish, Edit2 } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { useGear } from '../hooks/useGear';

interface GearTabProps {
    userId: string;
    userGear: any[];
    isLoadingGear: boolean;
    onGearReload: () => void;
    showGearPublicly?: boolean;
    onShowGearPubliclyChange?: (value: boolean) => void;
    isUpdatingProfile?: boolean;
}

export const GearTab = ({ 
    userId, 
    userGear, 
    isLoadingGear, 
    onGearReload,
    showGearPublicly = false,
    onShowGearPubliclyChange,
    isUpdatingProfile = false
}: GearTabProps) => {
    const { isAddingGear, addGear, updateGear, deleteGear } = useGear(userId);
    const [showAddGearModal, setShowAddGearModal] = useState(false);
    const [editingGear, setEditingGear] = useState<any | null>(null);
    const [newGear, setNewGear] = useState({
        gear_type: 'undita',
        brand: '',
        model: '',
        description: '',
        quantity: 1,
        purchase_date: '',
        price: 0
    });

    const handleAddGear = async () => {
        const success = await addGear(newGear);
        if (success) {
            setShowAddGearModal(false);
            setNewGear({
                gear_type: 'undita',
                brand: '',
                model: '',
                description: '',
                quantity: 1,
                purchase_date: '',
                price: 0
            });
            onGearReload();
        }
    };

    const handleEditGear = (gear: any) => {
        setEditingGear(gear);
        setNewGear({
            gear_type: gear.gear_type || 'undita',
            brand: gear.brand || '',
            model: gear.model || '',
            description: gear.description || '',
            quantity: gear.quantity || 1,
            purchase_date: gear.purchase_date ? gear.purchase_date.split('T')[0] : '',
            price: gear.purchase_price || 0
        });
    };

    const handleUpdateGear = async () => {
        if (!editingGear) return;
        const success = await updateGear(editingGear.id, newGear);
        if (success) {
            setEditingGear(null);
            setShowAddGearModal(false);
            setNewGear({
                gear_type: 'undita',
                brand: '',
                model: '',
                description: '',
                quantity: 1,
                purchase_date: '',
                price: 0
            });
            onGearReload();
        }
    };

    const handleCancelEdit = () => {
        setEditingGear(null);
        setShowAddGearModal(false);
        setNewGear({
            gear_type: 'undita',
            brand: '',
            model: '',
            description: '',
            quantity: 1,
            purchase_date: '',
            price: 0
        });
    };

    const handleDeleteGear = async (gearId: string) => {
        await deleteGear(gearId);
        onGearReload();
    };

    return (
        <>
            <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Echipamentele mele</h2>
                    <Button
                        onClick={() => setShowAddGearModal(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Wrench className="w-4 h-4 mr-2" />
                        Adaugă echipament
                    </Button>
                </div>

                {/* Toggle vizibilitate echipamente */}
                {onShowGearPubliclyChange && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                                        Vizibilitate echipamente
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Dacă este activată, echipamentele tale vor fi vizibile pe profilul public
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showGearPublicly}
                                        onChange={(e) => onShowGearPubliclyChange(e.target.checked)}
                                        disabled={isUpdatingProfile}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
                                </label>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {isLoadingGear ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Se încarcă echipamentele...</p>
                </div>
            ) : userGear.length > 0 ? (
                <div className="space-y-3">
                    {userGear.map((gear) => (
                        <Card key={gear.id} className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-300">
                            <CardContent className="pt-4 pb-4">
                                <div className="flex items-center justify-between gap-4">
                                    {/* Left side - Gear info */}
                                    <div className="flex-1 min-w-0 flex items-center gap-4">
                                        {/* Badge tip cu emoji */}
                                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 shrink-0">
                                            {gear.gear_type === 'undita' && '🎣 '}
                                            {gear.gear_type === 'mulineta' && '🔄 '}
                                            {gear.gear_type === 'scaun' && '🪑 '}
                                            {gear.gear_type === 'rucsac' && '🎒 '}
                                            {gear.gear_type === 'vesta' && '🧥 '}
                                            {gear.gear_type === 'cizme' && '👢 '}
                                            {gear.gear_type === 'altceva' && '📦 '}
                                            <span className="capitalize">{gear.gear_type}</span>
                                        </span>
                                        
                                        {/* Main info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-semibold text-gray-700">Marcă:</span>
                                                    <span className="text-sm text-gray-900">{gear.brand || '-'}</span>
                                                </div>
                                                <span className="text-gray-300 text-xs flex items-center">•</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-semibold text-gray-700">Model:</span>
                                                    <span className="text-sm text-gray-900">{gear.model || '-'}</span>
                                                </div>
                                                {gear.description && (
                                                    <>
                                                        <span className="text-gray-300 text-xs flex items-center">•</span>
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="text-xs font-semibold text-gray-700">Descriere:</span>
                                                            <span className="text-sm text-gray-700 truncate">{gear.description}</span>
                                                        </div>
                                                    </>
                                                )}
                                                <span className="text-gray-300 text-xs flex items-center">•</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-semibold text-gray-700">Cantitate:</span>
                                                    <span className="text-sm text-gray-900">{gear.quantity}x</span>
                                                </div>
                                                {gear.purchase_price && gear.purchase_price > 0 && (
                                                    <>
                                                        <span className="text-gray-300 text-xs flex items-center">•</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-semibold text-gray-700">Preț:</span>
                                                            <span className="text-sm text-green-600">{gear.purchase_price} RON</span>
                                                        </div>
                                                    </>
                                                )}
                                                {gear.purchase_date && (
                                                    <>
                                                        <span className="text-gray-300 text-xs flex items-center">•</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            <span className="text-xs text-gray-500">{new Date(gear.purchase_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right side - Actions */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditGear(gear)}
                                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full"
                                            title="Editează"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteGear(gear.id)}
                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
                                            title="Șterge"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <Fish className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nu ai echipamente adăugate</h3>
                    <p className="text-gray-600 mb-4">Adaugă echipamentele tale de pescuit!</p>
                    <Button onClick={() => setShowAddGearModal(true)}>
                        Adaugă primul echipament
                    </Button>
                </div>
            )}

            {/* Modal Adăugare/Editare Echipament */}
            {(showAddGearModal || editingGear) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }} onClick={handleCancelEdit}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                                        <Wrench className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{editingGear ? 'Editează echipament' : 'Adaugă echipament nou'}</h3>
                                        <p className="text-sm text-gray-600 mt-0.5">{editingGear ? 'Modifică detaliile echipamentului' : 'Completează informațiile despre echipament'}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    className="h-8 w-8 p-0 rounded-full text-gray-500 hover:text-gray-700 hover:bg-white/80"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </Button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-6 overflow-y-auto flex-1">

                            <div className="space-y-5">
                                <div>
                                    <Label htmlFor="gear_type" className="text-sm font-semibold text-gray-700 mb-2 block">
                                        Tip echipament
                                    </Label>
                                    <select
                                        id="gear_type"
                                        value={newGear.gear_type}
                                        onChange={(e) => setNewGear({ ...newGear, gear_type: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                    >
                                        <option value="undita">🎣 Undiță</option>
                                        <option value="mulineta">🔄 Mulinetă</option>
                                        <option value="scaun">🪑 Scaun</option>
                                        <option value="rucsac">🎒 Rucsac</option>
                                        <option value="vesta">🧥 Vestă</option>
                                        <option value="cizme">👢 Cizme</option>
                                        <option value="altceva">📦 Altceva</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="brand" className="text-sm font-semibold text-gray-700 mb-2 block">
                                            Marcă <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="brand"
                                            value={newGear.brand}
                                            onChange={(e) => setNewGear({ ...newGear, brand: e.target.value })}
                                            placeholder="Ex: Shimano, Daiwa..."
                                            className="h-11"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="model" className="text-sm font-semibold text-gray-700 mb-2 block">
                                            Model <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="model"
                                            value={newGear.model}
                                            onChange={(e) => setNewGear({ ...newGear, model: e.target.value })}
                                            placeholder="Ex: Exage 4000..."
                                            className="h-11"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="description" className="text-sm font-semibold text-gray-700 mb-2 block">
                                        Descriere
                                    </Label>
                                    <textarea
                                        id="description"
                                        value={newGear.description}
                                        onChange={(e) => setNewGear({ ...newGear, description: e.target.value })}
                                        placeholder="Descrierea echipamentului (opțional)..."
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none h-24"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="quantity" className="text-sm font-semibold text-gray-700 mb-2 block">
                                            Cantitate
                                        </Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            min="1"
                                            value={newGear.quantity}
                                            onChange={(e) => setNewGear({ ...newGear, quantity: parseInt(e.target.value) || 1 })}
                                            className="h-11"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="price" className="text-sm font-semibold text-gray-700 mb-2 block">
                                            Preț (RON)
                                        </Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newGear.price}
                                            onChange={(e) => setNewGear({ ...newGear, price: parseFloat(e.target.value) || 0 })}
                                            placeholder="0.00"
                                            className="h-11"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="purchase_date" className="text-sm font-semibold text-gray-700 mb-2 block">
                                        Data cumpărării
                                    </Label>
                                    <DatePicker
                                        value={newGear.purchase_date || ''}
                                        onChange={(date) => setNewGear({ ...newGear, purchase_date: date })}
                                        placeholder="Selectează data cumpărării"
                                    />
                                </div>
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={isAddingGear}
                                className="px-6"
                            >
                                Anulează
                            </Button>
                            <Button
                                onClick={editingGear ? handleUpdateGear : handleAddGear}
                                disabled={isAddingGear}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-sm"
                            >
                                {isAddingGear ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        {editingGear ? 'Se actualizează...' : 'Se adaugă...'}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        {editingGear ? (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Salvează modificările
                                            </>
                                        ) : (
                                            <>
                                                <Wrench className="w-4 h-4" />
                                                Adaugă echipament
                                            </>
                                        )}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
