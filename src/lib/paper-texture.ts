// The "Paper" and "Laid paper" page textures: the paper-texture shader from Paper Shaders
// (https://shaders.paper.design), rendered once into a seamless greyscale tile that index.css repeats like a
// background image. The library loads only when one of them is shown, and the WebGL context is thrown away
// right after the one frame.

/** Tile size in pixels; shown at half that (PAPER_TILE_SIZE), so it stays crisp on 2× screens */
const TILE = 1024
/** Extra strip rendered past the tile and blended into its opposite edge, so the tile repeats without a seam */
const BLEND = 160
/** The tile's size on the page */
export const PAPER_TILE_SIZE = `${TILE / 2}px`

export type PaperVariant = 'paper' | 'laid'

/** What sets each variant apart from the shared uniforms below */
const VARIANTS: Record<PaperVariant, Record<string, number>> = {
  // Fibers and soft wrinkles
  paper: {},
  // The fine ribbing of writing paper: grain lined up in rows, no wrinkles
  laid: { u_roughness: 0.6, u_roughnessRows: 1, u_roughnessSize: 0.65, u_fiber: 0.3, u_wrinkles: 0, u_angle: 90, u_rotation: 90 },
}

const rendering = new Map<PaperVariant, Promise<string | null>>()

/** An object URL of the variant's tile, or null where WebGL2 is missing (index.css then keeps a CSS stand-in) */
function renderPaperTexture(variant: PaperVariant): Promise<string | null> {
  let tile = rendering.get(variant)
  if (!tile) rendering.set(variant, (tile = render(VARIANTS[variant]).catch(() => null)))
  return tile
}

/** Renders the variant (once) and hands it to index.css as --texture-<variant>-image */
export function showPaperTexture(variant: PaperVariant) {
  void renderPaperTexture(variant).then((url) => {
    if (!url) return
    const root = document.documentElement
    root.style.setProperty(`--texture-${variant}-image`, `url("${url}")`)
    root.style.setProperty('--paper-size', PAPER_TILE_SIZE)
  })
}

async function loaded(src: string) {
  const img = new Image()
  img.src = src
  await img.decode()
  return img
}

async function render(variant: Record<string, unknown>): Promise<string | null> {
  const { ShaderMount, paperTextureFragmentShader, getShaderNoiseTexture, getShaderColorFromString, emptyPixel, ShaderFitOptions } =
    await import('@paper-design/shaders')
  const noise = getShaderNoiseTexture()
  if (!noise) return null
  await noise.decode()
  const size = TILE + BLEND

  // Out of sight but laid out (the mount sizes its canvas from its parent), never in the way
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  // The mount scales its canvas with the screen; the pixel cap below makes it exactly size × size everywhere
  const cssSize = `${size}px`
  Object.assign(host.style, { position: 'fixed', left: '0', top: '0', width: cssSize, height: cssSize, opacity: '0', pointerEvents: 'none', zIndex: '-1' })
  document.body.append(host)
  let mount: InstanceType<typeof ShaderMount> | null = null
  try {
    const white = getShaderColorFromString('#ffffff')
    mount = new ShaderMount(
      host,
      paperTextureFragmentShader,
      {
        u_image: await loaded(emptyPixel),
        u_isImage: false,
        u_noiseTexture: noise,
        u_colorBack: white,
        u_colorPaper: white,
        u_colorShadow: getShaderColorFromString('#737373'),
        u_blending: 0,
        u_distortion: 0,
        u_clip: false,
        u_angle: 300,
        u_seed: 4,
        u_roughness: 0.4,
        u_roughnessSize: 0.5,
        u_roughnessRows: 0,
        u_fiber: 0.5,
        u_fiberSize: 0.5,
        u_folds: 0,
        u_foldSizeX: 1,
        u_foldSizeY: 1,
        u_foldOffsetX: 0,
        u_foldOffsetY: 0,
        u_wrinkles: 0.4,
        u_wrinkleSize: 0.5,
        u_crumples: 0,
        u_crumpleCount: 6,
        u_drops: 0,
        u_fit: ShaderFitOptions.cover,
        u_scale: 1,
        u_rotation: 0,
        u_offsetX: 0,
        u_offsetY: 0,
        u_originX: 0.5,
        u_originY: 0.5,
        u_worldWidth: 0,
        u_worldHeight: 0,
        ...variant,
      },
      { preserveDrawingBuffer: true, premultipliedAlpha: false },
      0,
      0,
      1,
      size * size,
    )
    // The mount sizes its canvas (a fresh one is 300×150) once it has measured its parent
    const sized = () => mount!.canvasElement.width >= size * 0.95
    for (let i = 0; i < 30 && !sized(); i++) await new Promise(requestAnimationFrame)
    if (!sized()) return null
    mount.setFrame(0)

    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(mount.canvasElement, 0, 0, size, size)
    const tile = seamless(ctx.getImageData(0, 0, size, size))
    canvas.width = canvas.height = TILE
    ctx.putImageData(tile, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    return blob && URL.createObjectURL(blob)
  } finally {
    const gl = mount?.canvasElement.getContext('webgl2')
    mount?.dispose()
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    host.remove()
  }
}

/**
 * Cuts a TILE×TILE tile from a (TILE+BLEND)² render that repeats without a seam: near its left and top edges
 * each pixel fades from the strip past the far edge (which continues the opposite side) into its own.
 */
function seamless(src: ImageData): ImageData {
  const size = src.width
  const out = new ImageData(TILE, TILE)
  const px = (x: number, y: number) => src.data[(y * size + x) * 4]
  // Greyscale, so one channel is enough; smoothstep keeps the fade invisible
  const fade = (i: number) => {
    const t = i / BLEND
    return t * t * (3 - 2 * t)
  }
  const column = (x: number, y: number) => (x < BLEND ? px(x + TILE, y) + (px(x, y) - px(x + TILE, y)) * fade(x) : px(x, y))
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const v = y < BLEND ? column(x, y + TILE) + (column(x, y) - column(x, y + TILE)) * fade(y) : column(x, y)
      const i = (y * TILE + x) * 4
      out.data[i] = out.data[i + 1] = out.data[i + 2] = v
      out.data[i + 3] = 255
    }
  }
  return out
}

/** The Appearance panel's preview tiles show every variant, not just the chosen one */
export function showPaperTextureSamples() {
  for (const variant of Object.keys(VARIANTS) as PaperVariant[]) showPaperTexture(variant)
}
