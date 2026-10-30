import { useEffect, useState } from 'react'

/** Where stored images come from: the app's database (main.tsx sets it), or the components page's sample pictures */
type AssetSource = (assetId: string) => Promise<Blob | undefined>
let source: AssetSource = () => Promise.resolve(undefined)

export function setAssetSource(next: AssetSource) {
  source = next
}

/**
 * Object URL for a stored image: `undefined` while loading, `null` if the image is missing.
 * Assets never change once stored, so this reads once and revokes the URL on unmount.
 */
export function useAssetUrl(assetId: string) {
  const [url, setUrl] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    void source(assetId).then((blob) => {
      if (cancelled) return
      objectUrl = blob ? URL.createObjectURL(blob) : null
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [assetId])

  return url
}
