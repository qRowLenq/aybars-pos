/* Local product photographs, independent of persisted inventory and sales. */
(() => {
  const data = window.productPhotoData || {};
  const normalize = value => String(value || '').normalize('NFC').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
  const barcodePhotos = new Map();
  const repeated = new Set();
  for (const photo of Object.values(data)) {
    if (!photo.barcode) continue;
    if (barcodePhotos.has(photo.barcode)) repeated.add(photo.barcode);
    else barcodePhotos.set(photo.barcode, photo);
  }
  for (const barcode of repeated) barcodePhotos.delete(barcode);

  window.appendProductPhoto = (card, product) => {
    const known = data[String(product.id)];
    const photo = known && normalize(known.name) === normalize(product.name)
      ? known : barcodePhotos.get(String(product.barcode || ''));
    const wrapper = document.createElement('div');
    wrapper.className = 'p-photo-wrap';
    if (photo) {
      const image = document.createElement('span');
      image.className = 'p-photo';
      image.setAttribute('role', 'img');
      image.setAttribute('aria-label', product.name);
      image.style.backgroundImage = `url("assets/product-photos/catalog-${photo.s}.webp")`;
      image.style.backgroundPosition = `${-photo.x * 120}px ${-photo.y * 120}px`;
      wrapper.appendChild(image);
    } else {
      wrapper.classList.add('p-photo-unavailable');
      wrapper.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/></svg><span>Fotoğraf yok</span>';
    }
    card.insertBefore(wrapper, card.querySelector('.p-name'));
  };
})();
