import React from 'react';
import { useParams } from 'react-router-dom';

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Categoria {id}</h1>
      <p>Pagina categoriei va fi implementată aici.</p>
      </div>
  );
}