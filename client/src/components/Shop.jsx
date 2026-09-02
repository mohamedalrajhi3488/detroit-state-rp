import React, { useMemo, useState } from 'react'
import { normalizeProductGallery } from '../productUtils.mjs'

export default function Shop({ products = [] }) {
  const safeProducts = Array.isArray(products) && products.length ? products : []
  const [selectedProduct, setSelectedProduct] = useState(null)

  const galleryImages = useMemo(() => {
    if (!selectedProduct) return []
    return normalizeProductGallery(selectedProduct)
  }, [selectedProduct])

  const openProduct = (product) => setSelectedProduct(product)
  const closeProduct = () => setSelectedProduct(null)

  return (
    <>
      <section id="shop" className="shop-section store-page-shell">
        <div className="shop-hero hero-shell">
          <div className="shop-hero-backdrop hero-background" style={{ backgroundImage: `linear-gradient(90deg, rgba(3,7,13,0.74), rgba(3,7,13,0.4)), url('/img/banner.png')` }} />
          <div className="hero-content shop-hero-copy">
            <span className="rules-page-eyebrow">المتجر</span>
            <h1 className="hero-title shop-title">DS STORE</h1>

            <p className="hero-subtitle shop-subtitle">
               اختر الخطة المناسبة لك واستمتع بمزايا VIP، دعم فوري سريع، وتجربة شراء سهلة ومميزة وكل هذا واكثر داخل مجتمع ديترويت.
            </p>

          </div>
        </div>

        <div id="store-products" className="shop-product-grid">
          {safeProducts.length ? safeProducts.map((product) => {
            const productGallery = normalizeProductGallery(product)
            const image = productGallery[0] || '/img/DS.webp'

            return (
              <article key={product.id || product.name} className={`shop-card ${product.featured ? 'featured-plan' : ''}`}>
                <button type="button" className="shop-card-button" onClick={() => openProduct(product)} aria-label={`عرض تفاصيل ${product.name || 'المنتج'}`}>
                  <div className="shop-product-image" style={{ backgroundImage: `url(${image})` }} />
                  <div className="shop-product-header">
                    <span className={`plan-badge ${product.featured ? '' : 'secondary'}`}>
                      {product.featured ? 'الأكثر طلبًا' : 'مميز'}
                    </span>
                    <h3>{product.name || 'منتج'}</h3>
                  </div>

                  <div className="plan-price">
                    {product.price || '0'}<span>{product.currency || 'ر.س'}</span>
                  </div>

                  <p className="shop-product-description">{product.description || 'وصف المنتج.'}</p>

                  {(() => {
                    const raw = Array.isArray(product.features) ? product.features : []
                    const normalized = raw.map((feat) => (typeof feat === 'string' ? { text: feat, highlight: false } : { text: feat?.text || '', highlight: Boolean(feat?.highlight) }))
                    const filtered = normalized.filter((f) => String(f.text || '').trim())
                    if (!filtered.length) return null
                    return (
                      <ul>
                        {filtered.map((feat, i) => (
                          <li key={`${product.id || product.name}-feat-${i}`} className={feat.highlight ? 'feature-highlight' : ''}>{feat.text}</li>
                        ))}
                      </ul>
                    )
                  })()}
                </button>

                <a className="btn btn-primary shop-buy-btn" href={product.link || 'https://detroit-state-rp.tebex.io/'} target="_blank" rel="noreferrer">
                  شراء الآن
                </a>
              </article>
            )
          }) : (
            <div className="shop-empty-state shop-empty-state-wide">لا توجد منتجات حالياً.</div>
          )}
        </div>
      </section>

      {selectedProduct && (
        <div className="product-modal-backdrop" onClick={closeProduct}>
          <div className="product-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="product-modal-close" onClick={closeProduct} aria-label="إغلاق">×</button>

            <div className="product-modal-gallery">
              <div className="product-modal-main-image" style={{ backgroundImage: `url(${galleryImages[0] || '/img/DS.webp'})` }} />
              <div className="product-modal-thumbs">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${selectedProduct.id || selectedProduct.name}-thumb-${index}`}
                    type="button"
                    className="product-modal-thumb"
                    onClick={() => {
                      const mainImage = document.querySelector('.product-modal-main-image')
                      if (mainImage) mainImage.style.backgroundImage = `url(${image})`
                    }}
                    style={{ backgroundImage: `url(${image})` }}
                    aria-label={`عرض الصورة ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="product-modal-copy">
              <span className="product-modal-tag">{selectedProduct.featured ? 'الأكثر طلبًا' : 'منتج'}</span>
              <h3>{selectedProduct.name || 'منتج'}</h3>
              <div className="product-modal-price">
                {selectedProduct.price || '0'}<span>{selectedProduct.currency || 'ر.س'}</span>
              </div>
              <p>{selectedProduct.description || 'لا يوجد وصف لهذا المنتج.'}</p>

              {(() => {
                const raw = Array.isArray(selectedProduct.features) ? selectedProduct.features : []
                const normalized = raw.map((feat) => (typeof feat === 'string' ? { text: feat, highlight: false } : { text: feat?.text || '', highlight: Boolean(feat?.highlight) }))
                const filtered = normalized.filter((f) => String(f.text || '').trim())
                if (!filtered.length) return null
                return (
                  <ul className="product-modal-features">
                    {filtered.map((feat, i) => <li key={`modal-feat-${i}`} className={feat.highlight ? 'feature-highlight' : ''}>{feat.text}</li>)}
                  </ul>
                )
              })()}

              <a className="btn btn-primary product-modal-buy" href={selectedProduct.link || 'https://detroit-state-rp.tebex.io/'} target="_blank" rel="noreferrer">
                شراء الآن
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
