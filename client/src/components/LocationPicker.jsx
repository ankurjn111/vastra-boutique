import React, { useEffect, useRef, useState } from 'react';
import './LocationPicker.css';

const LEAFLET_VERSION = '1.9.4';
let leafletPromise;
let lastNominatimRequest = 0;

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet-styles]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
      link.dataset.leafletStyles = 'true';
      document.head.appendChild(link);
    }

    const existing = document.querySelector('script[data-leaflet-loader]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L), { once: true });
      existing.addEventListener('error', () => reject(new Error('Map library could not be loaded.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
    script.async = true;
    script.dataset.leafletLoader = 'true';
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Map library could not be loaded. Check your internet connection.'));
    document.head.appendChild(script);
  }).catch((error) => {
    leafletPromise = null;
    throw error;
  });

  return leafletPromise;
}

async function nominatimRequest(url) {
  const wait = Math.max(0, 1100 - (Date.now() - lastNominatimRequest));
  if (wait) await new Promise((resolve) => window.setTimeout(resolve, wait));
  lastNominatimRequest = Date.now();
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Address lookup is temporarily unavailable. You can enter the address manually.');
  return response.json();
}

function mapAddress(result) {
  const address = result.address || {};
  return {
    address: result.display_name || '',
    city: address.city || address.town || address.village || address.municipality || address.county || '',
    state: address.state || '',
    pincode: address.postcode || '',
  };
}

function LocationPicker({ onSelect }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('Search for an address or click the map to select your delivery location.');
  const [loading, setLoading] = useState(false);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    let active = true;
    let map;

    loadLeaflet().then((L) => {
      if (!active || !mapElementRef.current || mapRef.current) return;
      map = L.map(mapElementRef.current).setView([26.9124, 75.7873], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      map.on('click', (event) => selectCoordinates(event.latlng.lat, event.latlng.lng, L));
      mapRef.current = map;
    }).catch((error) => {
      if (active) setMessage(error.message);
    });

    return () => {
      active = false;
      if (map) map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  async function selectCoordinates(latitude, longitude, L = window.L) {
    if (!L || !mapRef.current) return;
    setLoading(true);
    setMessage('Finding the selected address…');
    try {
      const results = await nominatimRequest(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${latitude}&lon=${longitude}`
      );
      const location = { latitude, longitude, ...mapAddress(results) };
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = L.circleMarker([latitude, longitude], {
        radius: 9, color: '#683b3b', weight: 3, fillColor: '#ffffff', fillOpacity: 1,
      }).addTo(mapRef.current);
      onSelectRef.current(location);
      setSearch(location.address);
      setMessage('Location selected. You can still edit the address and add house or landmark details.');
    } catch (error) {
      setMessage(error.message || 'Address lookup failed. You can enter the address manually.');
    } finally {
      setLoading(false);
    }
  }

  async function searchAddress(event) {
    event.preventDefault();
    if (!search.trim() || !mapRef.current || loading) return;
    setLoading(true);
    setMessage('Searching for this address…');
    try {
      const query = new URLSearchParams({
        format: 'jsonv2', addressdetails: '1', country: 'India', limit: '1', q: search.trim(),
      });
      const results = await nominatimRequest(`https://nominatim.openstreetmap.org/search?${query}`);
      if (!results.length) {
        setMessage('No matching location found. Try a nearby landmark or click the map manually.');
        return;
      }
      const point = results[0];
      const latitude = Number(point.lat);
      const longitude = Number(point.lon);
      mapRef.current.setView([latitude, longitude], 16);
      await selectCoordinates(latitude, longitude);
    } catch (error) {
      setMessage(error.message || 'Search failed. You can enter the address manually.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="location-picker">
      <form className="location-picker__search" onSubmit={searchAddress}>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search area, street or landmark" aria-label="Search map location" />
        <button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search map'}</button>
      </form>
      <div className="location-picker__map" ref={mapElementRef} role="application" aria-label="OpenStreetMap. Click to select delivery location." />
      <p className="location-picker__message" aria-live="polite">{message}</p>
      <p className="location-picker__attribution">Map data &copy; OpenStreetMap contributors</p>
    </div>
  );
}

export default LocationPicker;
