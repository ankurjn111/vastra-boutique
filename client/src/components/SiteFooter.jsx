import React from 'react';

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <a className="brand brand--footer" href="#">
            <span className="brand__name">vastra</span>
            <span className="brand__caption">B O U T I Q U E</span>
          </a>
          <p>Indian wear made with care,<br />for the way you feel.</p>
        </div>
        <div className="footer-links">
          <span>EXPLORE</span>
          <a href="#collection">Shop all</a>
          <a href="#categories">Collections</a>
          <a href="#our-story">Our story</a>
        </div>
        <div className="footer-links">
          <span>YOUR NEXT STEP</span>
          <a href="#collection">Browse pieces</a>
          <a href="#collection">Check sizes</a>
          <a href="#our-story">About Vastra</a>
        </div>
        <div className="footer-note">
          <span className="footer-note__flower">✳</span>
          <p>Wear what feels<br /><em>like you.</em></p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Vastra Boutique. Made with care.</span>
        <span>INDIAN WEAR · MADE WITH FEELING</span>
      </div>
    </footer>
  );
}

export default SiteFooter;
