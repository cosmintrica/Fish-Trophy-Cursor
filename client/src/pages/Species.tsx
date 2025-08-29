import React from 'react';

const Species: React.FC = () => {
  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Catalog de Specii
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Descoperă toate speciile de pești din România cu informații detaliate 
            despre habitat, comportament și tehnici de pescuit.
          </p>
        </div>

        <div className="text-center py-20">
          <div className="bg-muted/50 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4">În Construcție</h2>
            <p className="text-muted-foreground">
              Această pagină va fi implementată în următoarele faze de dezvoltare.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Species;
