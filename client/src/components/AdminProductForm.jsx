import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'vastra-admin-token';

const initialForm = {
  name: '',
  description: '',
  category: '',
  price: '',
  discountPrice: '',
  sizes: '',
  stock: '0',
  fabric: '',
};

function AdminProductForm({ onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reviewNotes, setReviewNotes] = useState([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function selectFiles(event) {
    const selected = Array.from(event.target.files || []);
    setFiles(selected.slice(0, 5));
    setReviewNotes([]);
    setSuccess('');
    setError(selected.length > 5 ? 'You can upload up to 5 photos per dress.' : '');
  }

  async function suggestDetails() {
    setError('');
    setSuccess('');
    setReviewNotes([]);

    if (!files.length) {
      setError('Choose a dress photo before asking AI for suggestions.');
      return;
    }

    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      setError('Your admin session has ended. Please sign in again.');
      return;
    }

    setAnalyzing(true);
    try {
      const imageForm = new FormData();
      imageForm.append('image', files[0]);
      const response = await fetch(`${API_URL}/ai/analyze-dress`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: imageForm,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'AI could not suggest dress details.');
      }
      if (!data.suggestions || typeof data.suggestions !== 'object') {
        throw new Error('AI returned suggestions in an unexpected format.');
      }

      const suggestion = data.suggestions;
      setForm((current) => ({
        ...current,
        name: suggestion.name || current.name,
        description: suggestion.description || current.description,
        category: suggestion.category || current.category,
        fabric: suggestion.fabric && suggestion.fabric !== 'Unknown' ? suggestion.fabric : current.fabric,
        price: Number.isFinite(suggestion.price) ? String(suggestion.price) : current.price,
        discountPrice: suggestion.discountPrice > 0 ? String(suggestion.discountPrice) : '',
        sizes: Array.isArray(suggestion.sizes) ? suggestion.sizes.join(', ') : current.sizes,
        stock: Number.isInteger(suggestion.stock) ? String(suggestion.stock) : '0',
      }));
      setReviewNotes(Array.isArray(data.reviewBeforeSaving) ? data.reviewBeforeSaving : []);
      setSuccess('AI suggestions added to the form. Please review and edit before saving.');
    } catch (analysisError) {
      setError(analysisError.message || 'AI could not analyze this photo. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function submitProduct(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (files.length === 0) {
      setError('Please choose at least one dress photo.');
      return;
    }

    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      setError('Your admin session has ended. Please sign in again.');
      return;
    }

    setSaving(true);
    try {
      const uploadForm = new FormData();
      files.forEach((file) => uploadForm.append('images', file));

      const uploadResponse = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadForm,
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadData.message || 'Photos could not be uploaded.');
      }

      const product = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        price: Number(form.price),
        sizes: form.sizes.split(',').map((size) => size.trim()).filter(Boolean),
        images: uploadData.images,
        stock: Number(form.stock),
      };
      if (form.discountPrice) product.discountPrice = Number(form.discountPrice);
      if (form.fabric.trim()) product.fabric = form.fabric.trim();

      const productResponse = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      });
      const productData = await productResponse.json();
      if (!productResponse.ok) {
        throw new Error(productData.message || 'Dress could not be saved.');
      }

      setForm(initialForm);
      setFiles([]);
      event.target.reset();
      setSuccess(`${productData.name} has been added to the catalog.`);
      onCreated();
    } catch (submitError) {
      setError(submitError.message || 'Dress could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-product-form" onSubmit={submitProduct}>
      <div className="admin-panel__heading">
        <div>
          <span className="eyebrow"><span className="eyebrow__line" /> NEW CATALOG PIECE</span>
          <h2>Add a dress</h2>
        </div>
        <span className="admin-form-required">* Required fields</span>
      </div>

      <div className="admin-form-grid">
        <label className="admin-field admin-field--wide">
          Dress name *
          <input name="name" value={form.name} onChange={updateField} required maxLength={100} placeholder="e.g. Blue Anarkali Kurti" />
        </label>
        <label className="admin-field">
          Category *
          <input name="category" value={form.category} onChange={updateField} required maxLength={60} placeholder="e.g. Kurti" />
        </label>
        <label className="admin-field">
          Fabric
          <input name="fabric" value={form.fabric} onChange={updateField} maxLength={80} placeholder="e.g. Cotton" />
        </label>
        <label className="admin-field">
          Price (₹) *
          <input name="price" type="number" value={form.price} onChange={updateField} required min="1" step="1" placeholder="799" />
        </label>
        <label className="admin-field">
          Offer price (₹)
          <input name="discountPrice" type="number" value={form.discountPrice} onChange={updateField} min="1" step="1" placeholder="Optional" />
        </label>
        <label className="admin-field">
          Sizes * <span>Separate with commas</span>
          <input name="sizes" value={form.sizes} onChange={updateField} required placeholder="S, M, L" />
        </label>
        <label className="admin-field">
          Stock quantity
          <input name="stock" type="number" value={form.stock} onChange={updateField} min="0" step="1" />
        </label>
        <label className="admin-field admin-field--wide">
          Description *
          <textarea name="description" value={form.description} onChange={updateField} required maxLength={1000} rows="4" placeholder="Tell customers about the dress, fit and details." />
        </label>
        <label className="admin-field admin-field--wide">
          Dress photos * <span>Up to 5 JPG, PNG, or WebP images, max 5 MB each</span>
          <input className="admin-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectFiles} />
          <span className="admin-ai-actions">
            <button className="button button--outline" type="button" onClick={suggestDetails} disabled={!files.length || analyzing || saving}>
              {analyzing ? 'Analyzing first photo…' : 'Suggest details with AI'}
            </button>
            <span>AI will analyze the first selected photo.</span>
          </span>
          {previews.length > 0 && (
            <span className="admin-photo-previews">
              {previews.map((preview, index) => <img src={preview} alt={`Selected dress ${index + 1}`} key={preview} />)}
            </span>
          )}
        </label>
      </div>

      {error && <p className="admin-form-message admin-form-message--error" role="alert">{error}</p>}
      {success && <p className="admin-form-message admin-form-message--success" role="status">{success}</p>}
      {reviewNotes.length > 0 && (
        <aside className="admin-ai-review" aria-label="AI suggestions review notes">
          <strong>Review AI suggestions before saving</strong>
          <ul>{reviewNotes.map((note) => <li key={note}>{note}</li>)}</ul>
        </aside>
      )}
      <button className="button button--dark admin-submit" type="submit" disabled={saving}>
        {saving ? 'Uploading and saving…' : 'Add dress to catalog'}
      </button>
    </form>
  );
}

export default AdminProductForm;
