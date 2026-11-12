import React from 'react';
import Icon from './Icon.jsx';

function HeroSection() {
  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <span className="eyebrow"><span className="eyebrow__line" /> CLOTHES WITH A LITTLE MORE YOU</span>
          <h1>Made with feeling.<br /><em>Worn with joy.</em></h1>
          <p>Beautiful Indian wear, thoughtfully stitched in our boutique and made for the moments that make you, you.</p>
          <a className="button button--dark" href="#collection">Explore the collection <Icon name="arrow" size={17} /></a>
          <div className="hero__note">
            <span className="hero__note-mark">✳</span>
            <span>Small-batch pieces<br />made with care</span>
          </div>
        </div>
        <div className="hero__image-wrap">
          <img
            className="hero__image"
            src="/images/vastra-hero.png"
            alt="Model wearing a teal and rose embroidered festive outfit"
          />
          <div className="hero__image-caption">
            <span>THE NEW COLLECTION</span>
            <span>01 — 06</span>
          </div>
          <span className="hero__image-stamp">Made<br />for you</span>
        </div>
        <a className="scroll-cue" href="#categories"><span /> SCROLL TO DISCOVER</a>
      </section>

      <section className="values-strip" aria-label="What makes Vastra special">
        <span>Designed in our boutique</span><i>✳</i>
        <span>Made in small batches</span><i>✳</i>
        <span>Easy, thoughtful style</span><i>✳</i>
        <span>Made to feel like you</span>
      </section>
    </>
  );
}

export default HeroSection;
