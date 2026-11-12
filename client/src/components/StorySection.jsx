import React from 'react';
import Icon from './Icon.jsx';

function StorySection() {
  return (
    <>
      <section className="story" id="our-story">
        <div className="story__image">
          <img
            src="https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=1200&q=85"
            alt="Artisan fabric and hand-finished clothing"
            loading="lazy"
          />
          <span className="story__image-label">THE HAND BEHIND THE STITCH</span>
        </div>
        <div className="story__copy">
          <span className="eyebrow"><span className="eyebrow__line" /> NOT JUST ANOTHER OUTFIT</span>
          <h2>A little more<br />heart in <em>every stitch.</em></h2>
          <p>Vastra began with a simple thought: what if getting dressed felt a little more like being yourself? Every piece is chosen, shaped and stitched with care at our boutique—so it feels as good as it looks.</p>
          <a className="text-link" href="#collection">Find your piece <Icon name="arrow" size={16} /></a>
          <span className="story__signature">With love, <em>Vastra</em></span>
        </div>
        <span className="story__decor">✳</span>
      </section>

      <section className="newsletter">
        <div className="newsletter__flower">✳</div>
        <span className="eyebrow">A LITTLE MORE VASTRA</span>
        <h2>Find the piece that <em>feels like you.</em></h2>
        <p>Take a look through our collection and find something for your next moment.</p>
        <a className="button button--dark" href="#collection">See the collection <Icon name="arrow" size={17} /></a>
      </section>
    </>
  );
}

export default StorySection;
