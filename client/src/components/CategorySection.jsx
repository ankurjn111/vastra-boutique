import React from 'react';
import Icon from './Icon.jsx';

const categoryImages = [
  {
    title: 'Everyday elegance',
    subtitle: 'Easy pieces, made to feel like you.',
    image:
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85',
    className: 'category-card--large',
  },
  {
    title: 'Made for moments',
    subtitle: 'A little something for the celebrations.',
    image:
      'https://images.unsplash.com/photo-1583391733956-6c78276477e3?auto=format&fit=crop&w=900&q=85',
    className: '',
  },
];

function CategorySection({ onShowAllPieces }) {
  return (
    <section className="categories section-shell" id="categories">
      <div className="section-heading">
        <div>
          <span className="eyebrow"><span className="eyebrow__line" /> FIND YOUR FEEL</span>
          <h2>Pieces for <em>every side</em> of you.</h2>
        </div>
        <p>From slow mornings to special evenings, find something that feels just right.</p>
      </div>
      <div className="category-grid">
        {categoryImages.map((category, index) => (
          <a
            className={`category-card ${category.className}`}
            href="#collection"
            key={category.title}
            onClick={onShowAllPieces}
          >
            <img src={category.image} alt="" loading="lazy" />
            <span className="category-card__shade" />
            <span className="category-card__copy">
              <span className="category-card__eyebrow">0{index + 1} — VASTRA EDIT</span>
              <span className="category-card__title">{category.title}</span>
              <span className="category-card__subtitle">{category.subtitle}</span>
            </span>
            <span className="category-card__arrow"><Icon name="arrow" size={19} /></span>
          </a>
        ))}
        <a className="category-note" href="#our-story">
          <span className="category-note__flower">✳</span>
          <span className="eyebrow">A LITTLE ABOUT US</span>
          <span className="category-note__title">Made slowly,<br /><em>loved for longer.</em></span>
          <span className="category-note__link">Get to know Vastra <Icon name="arrow" size={16} /></span>
        </a>
      </div>
    </section>
  );
}

export default CategorySection;
