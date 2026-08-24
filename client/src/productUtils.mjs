export function normalizeProductGallery(product = {}) {
  const sourceList = Array.isArray(product?.gallery) ? product.gallery : []
  const itemList = Array.isArray(product?.images) ? product.images : sourceList

  const values = []
  const seen = new Set()

  const addValue = (value) => {
    if (!value || typeof value !== 'string') return
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) return
    seen.add(trimmed)
    values.push(trimmed)
  }

  if (typeof product?.image === 'string') addValue(product.image)
  if (typeof product?.image2 === 'string') addValue(product.image2)
  if (typeof product?.image3 === 'string') addValue(product.image3)
  if (typeof product?.image4 === 'string') addValue(product.image4)
  if (Array.isArray(product?.images)) product.images.forEach(addValue)
  if (Array.isArray(product?.gallery)) product.gallery.forEach(addValue)
  if (typeof product?.gallery === 'string') {
    product.gallery
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .forEach(addValue)
  }

  if (!values.length && itemList.length) {
    itemList.forEach((item) => addValue(typeof item === 'string' ? item : item?.url))
  }

  return values.length ? values : ['/img/DS.webp']
}
