import React, { useEffect, useRef, useState } from 'react';
import './LocationPicker.css';

const LEAFLET_VERSION = '1.9.4';
const JAIPUR = [26.9124, 75.7873];
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
    city: address.city || address.town || address.village || address.municipality || address.county || 'Jaipur',
    state: address.state || 'Rajasthan',
    pincode: address.postcode || '',
  };
}

function getFeatureLabel(properties) {
  return [
    properties.name,
    properties.housenumber,
    properties.street,
    properties.suburb || properties.neighbourhood,
    properties.district,
    properties.city || properties.town || properties.village,
    properties.state,
  ].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(', ');
}

function LocationPicker({ onSelect }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('Type an address or landmark to see suggestions, or click the map to drop a pin.');
  const [loading, setLoading] = useState(false);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    let active = true;
    let map;

    loadLeaflet().then((L) => {
      if (!active || !mapElementRef.current || mapRef.current) return;
      map = L.map(mapElementRef.current).setView(JAIPUR, 12);
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

  useEffect(() => {
    const term = search.trim();
    if (term.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const query = new URLSearchParams({
          q: `${term}, Jaipur, Rajasthan, India`,
          lat: String(JAIPUR[0]),
          lon: String(JAIPUR[1]),
          limit: '7',
          lang: 'en',
        });
        const response = await fetch(`https://photon.komoot.io/api/?${query}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Suggestions are temporarily unavailable.');
        const data = await response.json();
        const indiaResults = (data.features || []).filter((feature) => {
          const country = feature.properties?.country;
          return !country || country.toLowerCase() === 'india';
        });
        if (!controller.signal.aborted) {
          setSuggestions(indiaResults.slice(0, 6));
          setMessage(indiaResults.length ? 'Choose an address suggestion to zoom in and place the pin.' : 'No suggestions found. Try adding Jaipur or a nearby landmark.');
        }
      } catch (error) {
        if (error.name !== 'AbortError') setMessage(error.message || 'Could not load address suggestions.');
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 450);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

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
      markerRef.current = L.marker([latitude, longitude]).addTo(mapRef.current);
      onSelectRef.current(location);
      setSearch(location.address);
      setSuggestions([]);
      setMessage('Location selected. You can still edit the address and add house or landmark details.');
    } catch (error) {
      setMessage(error.message || 'Address lookup failed. You can enter the address manually.');
    } finally {
      setLoading(false);
    }
  }

  function chooseSuggestion(feature) {
    const [longitude, latitude] = feature.geometry.coordinates;
    const properties = feature.properties || {};
    const label = getFeatureLabel(properties) || properties.name || 'Selected map location';
    const L = window.L;
    if (!L || !mapRef.current) return;

    mapRef.current.setView([latitude, longitude], 18, { animate: true });
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = L.marker([latitude, longitude]).addTo(mapRef.current);
    const location = {
      latitude,
      longitude,
      address: label,
      city: properties.city || properties.town || properties.village || properties.district || 'Jaipur',
      state: properties.state || 'Rajasthan',
      pincode: properties.postcode || '',
    };
    onSelectRef.current(location);
    setSearch(label);
    setSuggestions([]);
    setMessage('Location selected and pinned. Drag the map or click another point to adjust the pin.');
  }

  function searchAddress(event) {
    event.preventDefault();
    if (suggestions.length) chooseSuggestion(suggestions[0]);
    else if (search.trim()) setMessage('No matching suggestion yet. Try a more complete address, such as “P.No. 21, Himgiri Royal Tower, Jaipur”.');
  }

  return (
    <div className="location-picker">
      <form className="location-picker__search" onSubmit={searchAddress}>
        <div className="location-picker__input-wrap">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => { if (search.trim().length >= 3) setMessage('Choose an address suggestion from the list.'); }}
            placeholder="Search plot, building, colony or landmark"
            aria-label="Search delivery address"
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
          />
          {searching && <span className="location-picker__searching">Finding suggestions…</span>}
          {suggestions.length > 0 && (
            <ul className="location-picker__suggestions" role="listbox" aria-label="Address suggestions">
              {suggestions.map((feature, index) => {
                const label = getFeatureLabel(feature.properties || {}) || 'Map location';
                return (
                  <li key={feature.properties?.osm_id || `${label}-${index}`}>
                    <button type="button" role="option" onClick={() => chooseSuggestion(feature)}>
                      <span className="location-picker__suggestion-icon" aria-hidden="true">⌖</span>
                      <span>{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <button type="submit" disabled={loading || searching}>{loading ? 'Selecting…' : 'Search map'}</button>
      </form>
      <div className="location-picker__map" ref={mapElementRef} role="application" aria-label="OpenStreetMap. Click to select delivery location." />
      <p className="location-picker__message" aria-live="polite">{message}</p>
      <p className="location-picker__attribution">Map data &copy; OpenStreetMap contributors</p>
    </div>
  );
}

export default LocationPicker;
