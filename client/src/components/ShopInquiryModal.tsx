import React, { useState, useCallback, useMemo } from 'react';
import { X, MapPin, Mail, Phone, Store, FileText, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ShopInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShopInquiryModal({ isOpen, onClose }: ShopInquiryModalProps) {
  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    county: '',
    googleMapsLink: '',
    description: ''
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  // Email domain suggestions (same as registration form)
  const emailDomains = useMemo(() => ['@gmail.com', '@outlook.com', '@yahoo.com', '@hotmail.com', '@icloud.com'], []);

  // Smart filter for email domains
  const filteredDomains = useMemo(() => {
    const parts = formData.email.split('@');
    if (parts.length === 1) {
      return emailDomains;
    }
    const domainPart = parts[1]?.toLowerCase() || '';
    return emailDomains.filter(domain => 
      domain.toLowerCase().includes(domainPart) && domain.toLowerCase() !== `@${domainPart}`
    );
  }, [formData.email, emailDomains]);

  const shouldShowEmailSuggestions = useCallback(() => {
    return formData.email.length > 0 && !formData.email.includes('@');
  }, [formData.email]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Special handling for phone - only allow numbers, spaces, +, -, and parentheses
    if (name === 'phone') {
      const phoneRegex = /^[0-9+\-() ]*$/;
      if (!phoneRegex.test(value)) {
        return; // Don't update if invalid character
      }
    }
    
    // Basic sanitization - remove potentially dangerous characters (optimized regex)
    const sanitizedValue = value.replace(/<script[^>]*>.*?<\/script>/gi, '');
    setFormData(prev => {
      // Only update if value actually changed
      if (prev[name as keyof typeof prev] === sanitizedValue) return prev;
      return { ...prev, [name]: sanitizedValue };
    });
  }, []);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast.error('Poți încărca maxim 5 poze');
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  }, [images]);

  const removeImage = useCallback((index: number) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      return newImages;
    });
    setImagePreviews(prev => {
      // Revoke object URL
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];

    const uploadedUrls: string[] = [];
    
    for (const image of images) {
      try {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `shop-inquiries/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('public')
          .upload(filePath, image);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('public')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.shopName || !formData.ownerName || !formData.email || !formData.address) {
      toast.error('Te rugăm să completezi toate câmpurile obligatorii');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images
      const imageUrls = await uploadImages();

      // Sanitize and validate data before saving
      const sanitizedData = {
        shop_name: formData.shopName.trim().substring(0, 255),
        owner_name: formData.ownerName.trim().substring(0, 255),
        email: formData.email.toLowerCase().trim().substring(0, 255),
        phone: formData.phone ? formData.phone.trim().substring(0, 50) : null,
        address: formData.address.trim().substring(0, 500),
        city: formData.city ? formData.city.trim().substring(0, 100) : null,
        county: formData.county ? formData.county.trim().substring(0, 100) : null,
        google_maps_link: formData.googleMapsLink ? formData.googleMapsLink.trim().substring(0, 500) : null,
        description: formData.description ? formData.description.trim().substring(0, 2000) : null,
        images: imageUrls.length > 0 ? imageUrls : null,
        status: 'pending' as const
      };

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedData.email)) {
        toast.error('Adresa de email nu este validă');
        return;
      }

      // Validate URL format if provided
      if (sanitizedData.google_maps_link && !sanitizedData.google_maps_link.startsWith('http://') && !sanitizedData.google_maps_link.startsWith('https://')) {
        toast.error('Link-ul Google Maps trebuie să înceapă cu http:// sau https://');
        return;
      }

      // Save inquiry to database
      const { error } = await supabase
        .from('fishing_shop_inquiries')
        .insert([sanitizedData]);

      if (error) {
        throw error;
      }

      toast.success('Cererea ta a fost trimisă cu succes! Te vom contacta în curând.');
      
      // Reset form
      setFormData({
        shopName: '',
        ownerName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        county: '',
        googleMapsLink: '',
        description: ''
      });
      setImages([]);
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      setImagePreviews([]);
      
      onClose();
    } catch (error: any) {
      console.error('Error submitting inquiry:', error);
      toast.error('A apărut o eroare. Te rugăm să încerci din nou.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        willChange: 'opacity',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }} 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          willChange: 'transform',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          perspective: '1000px'
        }}
      >
        {/* Header - Fixed, no scroll */}
        <div 
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 sm:p-4 rounded-t-xl flex items-center justify-between flex-shrink-0 z-10"
          style={{
            willChange: 'transform',
            transform: 'translateZ(0)'
          }}
        >
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 flex-shrink-0" />
            <h2 className="text-base sm:text-lg font-bold">Trimite Detalii Magazin</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
            type="button"
            aria-label="Închide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form - Scrollable content */}
        <form 
          onSubmit={handleSubmit} 
          className="p-3 sm:p-4 space-y-3 overflow-y-auto flex-1" 
          autoComplete="off"
          noValidate
          data-form-type="shop-inquiry"
          style={{ 
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            contain: 'layout style paint',
            contentVisibility: 'auto',
            transform: 'translateZ(0)'
          }}
        >
          {/* Shop Name */}
          <div style={{ contain: 'layout style' }}>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
              <Store className="w-3.5 h-3.5 inline mr-1" />
              Nume Magazin <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="shopName"
              value={formData.shopName}
              onChange={handleInputChange}
              required
              maxLength={255}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              placeholder="Ex: Magazinul de Pescuit XYZ"
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
            />
          </div>

          {/* Owner Name */}
          <div style={{ contain: 'layout style' }}>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
              Nume Proprietar <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleInputChange}
              required
              maxLength={255}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              placeholder="Numele tău complet"
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                <Mail className="w-3.5 h-3.5 inline mr-1" />
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setTimeout(() => setEmailFocused(false), 200)}
                  required
                  maxLength={255}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  placeholder="email@example.com"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                />
                {emailFocused && shouldShowEmailSuggestions() && filteredDomains.length > 0 && (
                  <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                    {filteredDomains.map((domain) => {
                      const parts = formData.email.split('@');
                      const localPart = parts[0] || '';
                      return (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, email: localPart + domain }));
                            setEmailFocused(false);
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          className="w-full text-left px-4 py-2 hover:bg-orange-50 text-sm text-gray-700"
                        >
                          {localPart}<span className="text-orange-600 font-medium">{domain}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {!formData.email.includes('@') && formData.email.length > 0 && (
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                  <span>❌</span> Email trebuie să conțină @
                </p>
              )}
            </div>
            <div style={{ contain: 'layout style' }}>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                <Phone className="w-3.5 h-3.5 inline mr-1" />
                Telefon
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                maxLength={50}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                placeholder="+40 123 456 789"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
          </div>

          {/* Address */}
          <div style={{ contain: 'layout style' }}>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              Adresă Completă <span className="text-red-500">*</span>
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              rows={2}
              maxLength={500}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
              placeholder="Strada, număr, bloc, scara, etc."
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
            />
          </div>

          {/* City & County */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div style={{ contain: 'layout style' }}>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                Oraș
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                maxLength={100}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                placeholder="Ex: București"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
            <div style={{ contain: 'layout style' }}>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                Județ
              </label>
              <input
                type="text"
                name="county"
                value={formData.county}
                onChange={handleInputChange}
                maxLength={100}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                placeholder="Ex: Ilfov"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
          </div>

          {/* Google Maps Link */}
          <div style={{ contain: 'layout style' }}>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
              <LinkIcon className="w-3.5 h-3.5 inline mr-1" />
              Link Google Maps
            </label>
            <input
              type="url"
              name="googleMapsLink"
              value={formData.googleMapsLink}
              onChange={handleInputChange}
              maxLength={500}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              placeholder="https://maps.google.com/..."
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
            />
          </div>

          {/* Description */}
          <div style={{ contain: 'layout style' }}>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              Detalii Despre Magazin
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
              placeholder="Descrie magazinul tău, serviciile oferite, programul de lucru, etc."
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
            />
          </div>

          {/* Images */}
          <div style={{ contain: 'layout style' }}>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
              <ImageIcon className="w-3.5 h-3.5 inline mr-1" />
              Poze (max 5)
            </label>
            <div className="space-y-3">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleImageChange}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs sm:text-sm"
                disabled={images.length >= 5}
                data-lpignore="true"
              />
              
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3" style={{ contain: 'layout' }}>
                  {imagePreviews.map((preview, index) => (
                    <div 
                      key={index} 
                      className="relative"
                      style={{
                        contain: 'layout style paint',
                        transform: 'translateZ(0)'
                      }}
                    >
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-20 sm:h-24 object-cover rounded-lg"
                        loading="lazy"
                        decoding="async"
                        style={{
                          transform: 'translateZ(0)',
                          backfaceVisibility: 'hidden'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-0.5 sm:p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        aria-label="Șterge imaginea"
                        style={{ transform: 'translateZ(0)' }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 order-2 sm:order-1"
              disabled={isSubmitting}
            >
              Anulează
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white order-1 sm:order-2"
              style={{
                willChange: 'transform',
                transform: 'translateZ(0)'
              }}
            >
              {isSubmitting ? 'Se trimite...' : 'Trimite Cererea'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

