/**
 * Admin Categories Component
 * CRUD pentru categorii, subcategorii și subforums
 */

import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCategories } from '../../hooks/useCategories';
import { 
    createCategory, 
    updateCategory, 
    deleteCategory,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    createSubforum,
    updateSubforum,
    deleteSubforum
} from '../../../services/forum/categories';
import { getForumSetting, setForumSetting } from '../../../services/forum/categories';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminCategories() {
    const { theme, isDarkMode } = useTheme();
    const { categories, loading, refetch } = useCategories();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [expandedSubcategories, setExpandedSubcategories] = useState<Record<string, boolean>>({});
    const [editingItem, setEditingItem] = useState<{ type: 'category' | 'subcategory' | 'subforum'; id: string } | null>(null);
    const [showCreateModal, setShowCreateModal] = useState<{ type: 'category' | 'subcategory' | 'subforum'; parentId?: string } | null>(null);
    // Load from database (global settings for all users)
    const [showCategoryIcons, setShowCategoryIcons] = useState(true);
    const [showSubcategoryIcons, setShowSubcategoryIcons] = useState(true);
    const [showSubforumIcons, setShowSubforumIcons] = useState(true);
    const [loadingSetting, setLoadingSetting] = useState(true);
    
    // Load all settings from database on mount
    useEffect(() => {
        const loadSettings = async () => {
            setLoadingSetting(true);
            const [catResult, subcatResult, subforumResult] = await Promise.all([
                getForumSetting('show_category_icons'),
                getForumSetting('show_subcategory_icons'),
                getForumSetting('show_subforum_icons')
            ]);
            if (catResult.data !== null) {
                setShowCategoryIcons(catResult.data === 'true');
            }
            if (subcatResult.data !== null) {
                setShowSubcategoryIcons(subcatResult.data === 'true');
            }
            if (subforumResult.data !== null) {
                setShowSubforumIcons(subforumResult.data === 'true');
            }
            setLoadingSetting(false);
        };
        loadSettings();
    }, []);
    
    // Save to database when changed (global for all users)
    const handleToggleCategoryIcons = async (newValue: boolean) => {
        const previousValue = showCategoryIcons;
        setShowCategoryIcons(newValue);
        try {
            const result = await setForumSetting('show_category_icons', newValue.toString());
            if (result?.error) {
                setShowCategoryIcons(previousValue);
                showToast('Eroare la salvare', 'error');
            } else {
                showToast(`Iconurile categoriilor ${newValue ? 'au fost activate' : 'au fost dezactivate'}`, 'success');
                queryClient.invalidateQueries({ queryKey: ['categories'] });
            }
        } catch (error) {
            setShowCategoryIcons(previousValue);
            showToast('Eroare la salvare', 'error');
        }
    };
    
    const handleToggleSubcategoryIcons = async (newValue: boolean) => {
        const previousValue = showSubcategoryIcons;
        setShowSubcategoryIcons(newValue);
        try {
            console.log('[AdminCategories] Toggling subcategory icons to:', newValue);
            const result = await setForumSetting('show_subcategory_icons', newValue.toString());
            console.log('[AdminCategories] setForumSetting result:', result);
            if (result?.error) {
                console.error('[AdminCategories] Error setting subcategory icons:', result.error);
                // Revert on error
                setShowSubcategoryIcons(previousValue);
                showToast('Eroare la salvare: ' + result.error.message, 'error');
            } else {
                console.log('[AdminCategories] Successfully set subcategory icons');
                showToast(`Iconurile subcategoriilor ${newValue ? 'au fost activate' : 'au fost dezactivate'}`, 'success');
                queryClient.invalidateQueries({ queryKey: ['categories'] });
            }
        } catch (error) {
            console.error('[AdminCategories] Exception setting subcategory icons:', error);
            // Revert on error
            setShowSubcategoryIcons(previousValue);
            showToast('Eroare la salvare: ' + (error instanceof Error ? error.message : 'Eroare necunoscută'), 'error');
        }
    };
    
    const handleToggleSubforumIcons = async (newValue: boolean) => {
        const previousValue = showSubforumIcons;
        setShowSubforumIcons(newValue);
        try {
            const result = await setForumSetting('show_subforum_icons', newValue.toString());
            if (result?.error) {
                setShowSubforumIcons(previousValue);
                showToast('Eroare la salvare', 'error');
            } else {
                showToast(`Iconurile subforumurilor ${newValue ? 'au fost activate' : 'au fost dezactivate'}`, 'success');
                queryClient.invalidateQueries({ queryKey: ['categories'] });
            }
        } catch (error) {
            setShowSubforumIcons(previousValue);
            showToast('Eroare la salvare', 'error');
        }
    };
    
    // Form states
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        icon: '',
        sort_order: 0,
        moderator_only: false,
        subcategory_id: '', // For subforums
        show_icon: true // Per item: show/hide icon
    });

    // Toggle expand
    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
    };

    const toggleSubcategory = (subcategoryId: string) => {
        setExpandedSubcategories(prev => ({ ...prev, [subcategoryId]: !prev[subcategoryId] }));
    };

    // Handle create
    const handleCreate = async () => {
        if (!showCreateModal) return;
        
        try {
            let result;
            
            if (showCreateModal.type === 'category') {
                result = await createCategory({
                    name: formData.name,
                    description: formData.description,
                    icon: formData.icon,
                    sort_order: formData.sort_order
                });
            } else if (showCreateModal.type === 'subcategory') {
                if (!showCreateModal.parentId) {
                    showToast('Eroare: Trebuie să selectezi o categorie părinte', 'error');
                    return;
                }
                result = await createSubcategory({
                    category_id: showCreateModal.parentId,
                    name: formData.name,
                    description: formData.description,
                    icon: formData.icon,
                    sort_order: formData.sort_order,
                    moderator_only: formData.moderator_only
                });
            } else if (showCreateModal.type === 'subforum') {
                if (!formData.subcategory_id) {
                    showToast('Eroare: Trebuie să selectezi o subcategorie părinte', 'error');
                    return;
                }
                result = await createSubforum({
                    subcategory_id: formData.subcategory_id,
                    name: formData.name,
                    description: formData.description,
                    icon: formData.icon,
                    sort_order: formData.sort_order
                });
            }

            if (result?.error) {
                showToast(result.error.message, 'error');
            } else {
                showToast(`${showCreateModal.type === 'category' ? 'Categoria' : showCreateModal.type === 'subcategory' ? 'Subcategoria' : 'Subforum-ul'} a fost creată cu succes!`, 'success');
                setShowCreateModal(null);
                resetForm();
                queryClient.invalidateQueries({ queryKey: ['categories'] });
                refetch();
            }
        } catch (error) {
            showToast('Eroare la creare', 'error');
        }
    };

    // Handle update
    const handleUpdate = async () => {
        if (!editingItem) return;
        
        try {
            let result;
            const updateParams: any = {
                name: formData.name,
                description: formData.description,
                icon: formData.icon,
                show_icon: formData.show_icon,
                sort_order: formData.sort_order
            };

            if (editingItem.type === 'category') {
                result = await updateCategory(editingItem.id, updateParams);
            } else if (editingItem.type === 'subcategory') {
                updateParams.moderator_only = formData.moderator_only;
                result = await updateSubcategory(editingItem.id, updateParams);
            } else if (editingItem.type === 'subforum') {
                if (formData.subcategory_id) {
                    updateParams.subcategory_id = formData.subcategory_id;
                }
                result = await updateSubforum(editingItem.id, updateParams);
            }

            if (result?.error) {
                showToast(result.error.message, 'error');
            } else {
                showToast(`${editingItem.type === 'category' ? 'Categoria' : editingItem.type === 'subcategory' ? 'Subcategoria' : 'Subforum-ul'} a fost actualizată!`, 'success');
                setEditingItem(null);
                resetForm();
                queryClient.invalidateQueries({ queryKey: ['categories'] });
                refetch();
            }
        } catch (error) {
            showToast('Eroare la actualizare', 'error');
        }
    };

    // Handle delete
    const handleDelete = async (type: 'category' | 'subcategory' | 'subforum', id: string, name: string) => {
        if (!confirm(`Ești sigur că vrei să ștergi ${type === 'category' ? 'categoria' : type === 'subcategory' ? 'subcategoria' : 'subforum-ul'} "${name}"?`)) {
            return;
        }

        try {
            let result;
            if (type === 'category') {
                result = await deleteCategory(id);
            } else if (type === 'subcategory') {
                result = await deleteSubcategory(id);
            } else {
                result = await deleteSubforum(id);
            }

            if (result?.error) {
                showToast(result.error.message, 'error');
            } else {
                showToast(`${type === 'category' ? 'Categoria' : type === 'subcategory' ? 'Subcategoria' : 'Subforum-ul'} a fost ștearsă!`, 'success');
                queryClient.invalidateQueries({ queryKey: ['categories'] });
                refetch();
            }
        } catch (error) {
            showToast('Eroare la ștergere', 'error');
        }
    };

    // Start editing
    const startEdit = (type: 'category' | 'subcategory' | 'subforum', item: any) => {
        setEditingItem({ type, id: item.id });
        setFormData({
            name: item.name || '',
            description: item.description || '',
            icon: item.icon || '',
            sort_order: item.sort_order || 0,
            moderator_only: item.moderator_only || false,
            subcategory_id: item.subcategory_id || '',
            show_icon: item.show_icon !== undefined ? item.show_icon : (item.icon ? true : false) // Default: true if icon exists
        });
    };

    // Start create
    const startCreate = (type: 'category' | 'subcategory' | 'subforum', parentId?: string) => {
        setShowCreateModal({ type, parentId });
        resetForm();
        if (parentId && type === 'subforum') {
            setFormData(prev => ({ ...prev, subcategory_id: parentId }));
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            icon: '',
            sort_order: 0,
            moderator_only: false,
            subcategory_id: '',
            show_icon: true
        });
    };

    // Cancel edit/create
    const cancelEdit = () => {
        setEditingItem(null);
        setShowCreateModal(null);
        resetForm();
    };

    return (
        <div style={{ padding: '1.5rem' }}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1.5rem'
            }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: theme.text }}>
                    Gestionare Categorii
                </h2>
                <button
                    onClick={() => startCreate('category')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: theme.primary,
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                    <Plus size={16} />
                    Categorie Nouă
                </button>
            </div>

            {/* Create/Edit Modal */}
            {(showCreateModal || editingItem) && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}
                onClick={cancelEdit}
                >
                    <div
                        style={{
                            backgroundColor: theme.surface,
                            borderRadius: '0.75rem',
                            padding: '1.5rem',
                            width: '90%',
                            maxWidth: '500px',
                            maxHeight: '90vh',
                            overflowY: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: theme.text, marginBottom: '1rem' }}>
                            {editingItem 
                                ? `Editează ${editingItem.type === 'category' ? 'Categoria' : editingItem.type === 'subcategory' ? 'Subcategoria' : 'Subforum-ul'}`
                                : `Creează ${showCreateModal?.type === 'category' ? 'Categorie' : showCreateModal?.type === 'subcategory' ? 'Subcategorie' : 'Subforum'}`
                            }
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Name */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: theme.text, marginBottom: '0.5rem' }}>
                                    Nume *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        backgroundColor: theme.background,
                                        border: `1px solid ${theme.border}`,
                                        borderRadius: '0.5rem',
                                        color: theme.text,
                                        fontSize: '0.875rem'
                                    }}
                                    placeholder="Nume categorie/subcategorie/subforum"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: theme.text, marginBottom: '0.5rem' }}>
                                    Descriere
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        backgroundColor: theme.background,
                                        border: `1px solid ${theme.border}`,
                                        borderRadius: '0.5rem',
                                        color: theme.text,
                                        fontSize: '0.875rem',
                                        minHeight: '80px',
                                        resize: 'vertical'
                                    }}
                                    placeholder="Descriere (opțional)"
                                />
                            </div>

                            {/* Icon */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: theme.text, marginBottom: '0.5rem' }}>
                                    Icon (emoji)
                                </label>
                                <input
                                    type="text"
                                    value={formData.icon}
                                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        backgroundColor: theme.background,
                                        border: `1px solid ${theme.border}`,
                                        borderRadius: '0.5rem',
                                        color: theme.text,
                                        fontSize: '0.875rem'
                                    }}
                                    placeholder="📝"
                                />
                            </div>

                            {/* Show Icon Checkbox */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.5rem'
                            }}>
                                <label style={{ fontSize: '0.875rem', color: theme.text, cursor: 'pointer', userSelect: 'none' }}>
                                    Afișează icon
                                </label>
                                <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        id="show_icon"
                                        checked={formData.show_icon}
                                        onChange={(e) => setFormData(prev => ({ ...prev, show_icon: e.target.checked }))}
                                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                                    />
                                    <div style={{
                                        width: '44px',
                                        height: '24px',
                                        backgroundColor: formData.show_icon ? theme.primary : (isDarkMode ? '#4b5563' : '#d1d5db'),
                                        borderRadius: '9999px',
                                        position: 'relative',
                                        transition: 'background-color 0.2s',
                                        outline: 'none',
                                        boxShadow: formData.show_icon ? `0 0 0 3px ${theme.primary}20` : 'none'
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            top: '2px',
                                            left: formData.show_icon ? '22px' : '2px',
                                            width: '20px',
                                            height: '20px',
                                            backgroundColor: 'white',
                                            borderRadius: '50%',
                                            transition: 'left 0.2s',
                                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                                        }} />
                                    </div>
                                </label>
                            </div>

                            {/* Sort Order */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: theme.text, marginBottom: '0.5rem' }}>
                                    Ordine Sortare
                                </label>
                                <input
                                    type="number"
                                    value={formData.sort_order}
                                    onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        backgroundColor: theme.background,
                                        border: `1px solid ${theme.border}`,
                                        borderRadius: '0.5rem',
                                        color: theme.text,
                                        fontSize: '0.875rem'
                                    }}
                                />
                            </div>

                            {/* Moderator Only (for subcategories) */}
                            {(showCreateModal?.type === 'subcategory' || editingItem?.type === 'subcategory') && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', color: theme.text, cursor: 'pointer', userSelect: 'none' }}>
                                        Doar pentru moderatori
                                    </label>
                                    <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.moderator_only}
                                            onChange={(e) => setFormData(prev => ({ ...prev, moderator_only: e.target.checked }))}
                                            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                                        />
                                        <div style={{
                                            width: '44px',
                                            height: '24px',
                                            backgroundColor: formData.moderator_only ? theme.primary : (isDarkMode ? '#4b5563' : '#d1d5db'),
                                            borderRadius: '9999px',
                                            position: 'relative',
                                            transition: 'background-color 0.2s',
                                            outline: 'none',
                                            boxShadow: formData.moderator_only ? `0 0 0 3px ${theme.primary}20` : 'none'
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: '2px',
                                                left: formData.moderator_only ? '22px' : '2px',
                                                width: '20px',
                                                height: '20px',
                                                backgroundColor: 'white',
                                                borderRadius: '50%',
                                                transition: 'left 0.2s',
                                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                                            }} />
                                        </div>
                                    </label>
                                </div>
                            )}

                            {/* Subcategory Select (for subforums) */}
                            {(showCreateModal?.type === 'subforum' || editingItem?.type === 'subforum') && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: theme.text, marginBottom: '0.5rem' }}>
                                        Subcategorie Părinte *
                                    </label>
                                    <select
                                        value={formData.subcategory_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, subcategory_id: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            backgroundColor: theme.background,
                                            border: `1px solid ${theme.border}`,
                                            borderRadius: '0.5rem',
                                            color: theme.text,
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        <option value="">Selectează subcategorie</option>
                                        {categories?.map(category => 
                                            category.subcategories?.map(subcat => (
                                                <option key={subcat.id} value={subcat.id}>
                                                    {category.name} › {subcat.name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            )}

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button
                                    onClick={cancelEdit}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: theme.background,
                                        border: `1px solid ${theme.border}`,
                                        borderRadius: '0.5rem',
                                        color: theme.text,
                                        cursor: 'pointer',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    Anulează
                                </button>
                                <button
                                    onClick={editingItem ? handleUpdate : handleCreate}
                                    disabled={!formData.name.trim()}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: theme.primary,
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        color: 'white',
                                        cursor: formData.name.trim() ? 'pointer' : 'not-allowed',
                                        fontSize: '0.875rem',
                                        opacity: formData.name.trim() ? 1 : 0.5
                                    }}
                                >
                                    {editingItem ? 'Salvează' : 'Creează'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle pentru iconuri subcategorii */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                marginBottom: '1rem'
            }}>
                <span style={{ fontSize: '0.875rem', color: theme.text, fontWeight: '500' }}>
                    Afișează iconuri subcategorii
                </span>
                <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={showSubcategoryIcons}
                        onChange={(e) => handleToggleSubcategoryIcons(e.target.checked)}
                        disabled={loadingSetting}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <div style={{
                        width: '44px',
                        height: '24px',
                        backgroundColor: showSubcategoryIcons ? theme.primary : (isDarkMode ? '#4b5563' : '#d1d5db'),
                        borderRadius: '9999px',
                        position: 'relative',
                        transition: 'background-color 0.2s',
                        outline: 'none',
                        boxShadow: showSubcategoryIcons ? `0 0 0 3px ${theme.primary}20` : 'none'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '2px',
                            left: showSubcategoryIcons ? '22px' : '2px',
                            width: '20px',
                            height: '20px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: 'left 0.2s',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                        }} />
                    </div>
                </label>
            </div>

            {/* Categories List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: theme.textSecondary }}>
                    Se încarcă...
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {categories?.map((category) => (
                        <div
                            key={category.id}
                            style={{
                                backgroundColor: theme.surface,
                                border: `1px solid ${theme.border}`,
                                borderRadius: '0.5rem',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Category Header */}
                            <div
                                style={{
                                    padding: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer'
                                }}
                                onClick={() => toggleCategory(category.id)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                    {expandedCategories[category.id] ? (
                                        <ChevronDown size={20} color={theme.textSecondary} />
                                    ) : (
                                        <ChevronRight size={20} color={theme.textSecondary} />
                                    )}
                                    {(category.show_icon !== false) && (
                                        <span style={{ fontSize: '1.5rem' }}>{category.icon || '📁'}</span>
                                    )}
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: theme.text }}>
                                            {category.name}
                                        </div>
                                        {category.description && (
                                            <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                                                {category.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            startEdit('category', category);
                                        }}
                                        style={{
                                            padding: '0.375rem 0.75rem',
                                            backgroundColor: theme.background,
                                            border: `1px solid ${theme.border}`,
                                            borderRadius: '0.375rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                        }}
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete('category', category.id, category.name);
                                        }}
                                        style={{
                                            padding: '0.375rem 0.75rem',
                                            backgroundColor: '#dc2626',
                                            border: 'none',
                                            borderRadius: '0.375rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            color: 'white'
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Subcategories */}
                            {expandedCategories[category.id] && (
                                <div style={{ padding: '0 1rem 1rem 1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: theme.textSecondary, fontWeight: '500' }}>
                                            Subcategorii
                                        </div>
                                        <button
                                            onClick={() => startCreate('subcategory', category.id)}
                                            style={{
                                                padding: '0.25rem 0.5rem',
                                                backgroundColor: theme.primary,
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.375rem',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}
                                        >
                                            <Plus size={12} />
                                            Subcategorie
                                        </button>
                                    </div>

                                    {category.subcategories?.map((subcategory) => (
                                        <div
                                            key={subcategory.id}
                                            style={{
                                                backgroundColor: theme.background,
                                                border: `1px solid ${theme.border}`,
                                                borderRadius: '0.5rem',
                                                marginBottom: '0.5rem',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            {/* Subcategory Header */}
                                            <div
                                                style={{
                                                    padding: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => toggleSubcategory(subcategory.id)}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                                    {expandedSubcategories[subcategory.id] ? (
                                                        <ChevronDown size={16} color={theme.textSecondary} />
                                                    ) : (
                                                        <ChevronRight size={16} color={theme.textSecondary} />
                                                    )}
                                                    {showSubcategoryIcons && ((subcategory as any).show_icon !== false) && (
                                                        <span style={{ fontSize: '1.25rem' }}>{subcategory.icon || '📝'}</span>
                                                    )}
                                                    <div>
                                                        <div style={{ fontSize: '0.8125rem', fontWeight: '500', color: theme.text }}>
                                                            {subcategory.name}
                                                            {subcategory.moderator_only && (
                                                                <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: theme.secondary }}>
                                                                    (Moderatori)
                                                                </span>
                                                            )}
                                                        </div>
                                                        {subcategory.description && (
                                                            <div style={{ fontSize: '0.6875rem', color: theme.textSecondary }}>
                                                                {subcategory.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startEdit('subcategory', subcategory);
                                                        }}
                                                        style={{
                                                            padding: '0.25rem 0.5rem',
                                                            backgroundColor: theme.background,
                                                            border: `1px solid ${theme.border}`,
                                                            borderRadius: '0.375rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem'
                                                        }}
                                                    >
                                                        <Edit size={12} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete('subcategory', subcategory.id, subcategory.name);
                                                        }}
                                                        style={{
                                                            padding: '0.25rem 0.5rem',
                                                            backgroundColor: '#dc2626',
                                                            border: 'none',
                                                            borderRadius: '0.375rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                            color: 'white'
                                                        }}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Subforums */}
                                            {expandedSubcategories[subcategory.id] && (
                                                <div style={{ padding: '0 0.75rem 0.75rem 0.75rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                        <div style={{ fontSize: '0.6875rem', color: theme.textSecondary, fontWeight: '500' }}>
                                                            Sub-forumuri
                                                        </div>
                                                        <button
                                                            onClick={() => startCreate('subforum', subcategory.id)}
                                                            style={{
                                                                padding: '0.25rem 0.5rem',
                                                                backgroundColor: theme.secondary || theme.primary,
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '0.375rem',
                                                                cursor: 'pointer',
                                                                fontSize: '0.6875rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.25rem'
                                                            }}
                                                        >
                                                            <Plus size={10} />
                                                            Subforum
                                                        </button>
                                                    </div>

                                                    {subcategory.subforums && subcategory.subforums.length > 0 ? (
                                                            subcategory.subforums.map((subforum) => (
                                                            <div
                                                                key={subforum.id}
                                                                style={{
                                                                    backgroundColor: theme.surface,
                                                                    border: `1px solid ${theme.border}`,
                                                                    borderRadius: '0.375rem',
                                                                    padding: '0.5rem 0.75rem',
                                                                    marginBottom: '0.375rem',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                                                    {showSubforumIcons && (subforum.show_icon !== false) && (
                                                                        <span style={{ fontSize: '1rem' }}>{subforum.icon || '📁'}</span>
                                                                    )}
                                                                    <div>
                                                                        <div style={{ fontSize: '0.75rem', fontWeight: '500', color: theme.text }}>
                                                                            {subforum.name}
                                                                        </div>
                                                                        {subforum.description && (
                                                                            <div style={{ fontSize: '0.625rem', color: theme.textSecondary }}>
                                                                                {subforum.description}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '0.375rem' }}>
                                                                    <button
                                                                        onClick={() => startEdit('subforum', subforum)}
                                                                        style={{
                                                                            padding: '0.25rem 0.5rem',
                                                                            backgroundColor: theme.background,
                                                                            border: `1px solid ${theme.border}`,
                                                                            borderRadius: '0.375rem',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '0.25rem'
                                                                        }}
                                                                    >
                                                                        <Edit size={10} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete('subforum', subforum.id, subforum.name)}
                                                                        style={{
                                                                            padding: '0.25rem 0.5rem',
                                                                            backgroundColor: '#dc2626',
                                                                            border: 'none',
                                                                            borderRadius: '0.375rem',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '0.25rem',
                                                                            color: 'white'
                                                                        }}
                                                                    >
                                                                        <Trash2 size={10} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ fontSize: '0.6875rem', color: theme.textSecondary, fontStyle: 'italic', padding: '0.5rem' }}>
                                                            Nu există sub-forumuri
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {(!category.subcategories || category.subcategories.length === 0) && (
                                        <div style={{ fontSize: '0.75rem', color: theme.textSecondary, fontStyle: 'italic', padding: '0.5rem' }}>
                                            Nu există subcategorii
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {(!categories || categories.length === 0) && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: theme.textSecondary }}>
                            Nu există categorii. Creează prima categorie!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

