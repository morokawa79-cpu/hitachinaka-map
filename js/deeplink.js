;(function exposeMapDeepLink(root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.MapDeepLink = api
})(typeof globalThis !== 'undefined' ? globalThis : this, function createMapDeepLink() {
  const CITY_PAGES = Object.freeze({
    mito: 'mito.html',
    hitachinaka: 'hitachinaka.html',
    naka: 'naka.html',
  })

  function normalizeOazaName(value) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/^[\s　]+|[\s　]+$/g, '')
  }

  function parseCoordinate(value, min, max) {
    if (value == null || String(value).trim() === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= min && parsed <= max
      ? parsed
      : null
  }

  function parse(search) {
    const params = new URLSearchParams(search || '')
    const requestedCity = params.get('city')
    const city = requestedCity
      && Object.prototype.hasOwnProperty.call(CITY_PAGES, requestedCity)
      ? requestedCity
      : null
    const oaza = normalizeOazaName(params.get('oaza')) || null
    const lat = parseCoordinate(params.get('lat'), -90, 90)
    const lng = parseCoordinate(params.get('lng'), -180, 180)

    return {
      city,
      oaza,
      coordinates: lat != null && lng != null ? { lat, lng } : null,
    }
  }

  function cityFromPath(pathname) {
    const normalizedPath = String(pathname ?? '').replace(/\\/g, '/').toLowerCase()
    return Object.entries(CITY_PAGES).find(([, page]) =>
      normalizedPath === page || normalizedPath.endsWith(`/${page}`))?.[0] ?? null
  }

  function cityRedirectUrl(search, currentCity, hash) {
    const { city } = parse(search)
    if (!city || city === currentCity) return null
    const normalizedSearch = search
      ? String(search).startsWith('?') ? String(search) : `?${search}`
      : ''
    const normalizedHash = hash
      ? String(hash).startsWith('#') ? String(hash) : `#${hash}`
      : ''
    return `${CITY_PAGES[city]}${normalizedSearch}${normalizedHash}`
  }

  function findOazaName(names, requestedOaza) {
    const normalizedRequested = normalizeOazaName(requestedOaza)
    if (!normalizedRequested) return null
    return names.find(name => normalizeOazaName(name) === normalizedRequested) ?? null
  }

  function resolveMapAction(search, oazaNames) {
    const deepLink = parse(search)
    const matchedOaza = findOazaName(oazaNames, deepLink.oaza)
    if (matchedOaza) {
      return {
        type: 'oaza',
        name: matchedOaza,
        requestedOaza: deepLink.oaza,
      }
    }
    if (deepLink.coordinates) {
      return {
        type: 'marker',
        ...deepLink.coordinates,
        requestedOaza: deepLink.oaza,
      }
    }
    return {
      type: 'none',
      requestedOaza: deepLink.oaza,
    }
  }

  return {
    CITY_PAGES,
    cityFromPath,
    cityRedirectUrl,
    findOazaName,
    normalizeOazaName,
    parse,
    resolveMapAction,
  }
})
