import { Canvas, useThree, useFrame, invalidate } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import React, { Suspense, useEffect, useMemo, useState, useRef } from 'react'
import * as THREE from 'three'
import type { BlockEntry, Anchor, ConnectionPort, Vec3 } from '@shared/types.js'
import { getBlockColorForEntry } from '@shared/blockColors.js'

// ---- Constants ----------------------------------------------------------

const CHUNK_SIZE = 16
const AIR_IDS = new Set(['minecraft:air', 'minecraft:cave_air'])

// ---- Camera types -------------------------------------------------------

type CameraView = 'default' | 'top' | 'front'
interface CameraCmd { view: CameraView; n: number }

// ---- CameraController ---------------------------------------------------

function CameraController({ cmd, center, defaultPos }: {
  cmd: CameraCmd
  center: Vec3
  defaultPos: [number, number, number]
}) {
  const { camera, controls } = useThree()

  useEffect(() => {
    let pos: [number, number, number]
    if (cmd.view === 'default') {
      pos = defaultPos
    } else if (cmd.view === 'top') {
      pos = [center.x, defaultPos[1] * 1.4 + 10, center.z + 0.1]
    } else {
      pos = [center.x, center.y, defaultPos[2] * 1.4 + 10]
    }
    camera.position.set(...pos)
    if (controls) {
      const c = controls as unknown as { target: { set: (...a: number[]) => void }; update: () => void }
      c.target.set(center.x, center.y, center.z)
      c.update()
    }
    invalidate()
  }, [cmd])

  return null
}

// ---- FPS counter --------------------------------------------------------
// FPSUpdater runs inside Canvas (useFrame), writes to a DOM ref outside Canvas

function FPSUpdater({ domRef }: { domRef: React.RefObject<HTMLDivElement | null> }) {
  const frames = useRef(0)
  const last = useRef(performance.now())

  useFrame(() => {
    frames.current++
    const now = performance.now()
    if (now - last.current >= 500) {
      const fps = Math.round(frames.current / ((now - last.current) / 1000))
      if (domRef.current) domRef.current.textContent = `${fps} FPS`
      frames.current = 0
      last.current = now
    }
  })

  return null
}

// ---- Greedy meshing + face occlusion ------------------------------------

interface CellInfo {
  color: string
  emissive: boolean
  transparent: boolean
}

interface QuadAccum {
  positions: number[]
  normals:   number[]
  uvs:       number[]
  indices:   number[]
}

// [axis, side, uAxis, vAxis]
const FACE_AXES: [0|1|2, 1|-1, 0|1|2, 0|1|2][] = [
  [0, 1, 1, 2],
  [0, -1, 1, 2],
  [1, 1, 0, 2],
  [1, -1, 0, 2],
  [2, 1, 0, 1],
  [2, -1, 0, 1],
]

const NORMALS: [number,number,number][] = [
  [1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1],
]

function buildCellMaps(blocks: BlockEntry[]) {
  const cellMap = new Map<string, CellInfo>()
  const solidSet = new Set<string>()
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

  for (const b of blocks) {
    if (AIR_IDS.has(b.blockId)) continue
    const { color, emissive } = getBlockColorForEntry(b)
    const transparent = color.length > 7
    const key = `${b.x},${b.y},${b.z}`
    cellMap.set(key, { color, emissive: !!emissive, transparent })
    if (!transparent) solidSet.add(key)
    if (b.x < minX) minX = b.x; if (b.x > maxX) maxX = b.x
    if (b.y < minY) minY = b.y; if (b.y > maxY) maxY = b.y
    if (b.z < minZ) minZ = b.z; if (b.z > maxZ) maxZ = b.z
  }
  return { cellMap, solidSet, minX, minY, minZ, maxX, maxY, maxZ }
}

function buildChunkGeometries(
  cellMap: Map<string, CellInfo>,
  solidSet: Set<string>,
  cx: number, cy: number, cz: number,
): Map<string, { geo: THREE.BufferGeometry; emissive: boolean }> {
  // Map from "E:#rrggbb" or "R:#rrggbb" → QuadAccum
  const accum = new Map<string, QuadAccum>()

  const x0 = cx * CHUNK_SIZE, x1 = x0 + CHUNK_SIZE
  const y0 = cy * CHUNK_SIZE, y1 = y0 + CHUNK_SIZE
  const z0 = cz * CHUNK_SIZE, z1 = z0 + CHUNK_SIZE

  for (let fi = 0; fi < 6; fi++) {
    const [axis, side, uAxis, vAxis] = FACE_AXES[fi]
    const normal = NORMALS[fi]

    const axisMin = axis === 0 ? x0 : axis === 1 ? y0 : z0
    const axisMax = axis === 0 ? x1 : axis === 1 ? y1 : z1
    const uMin    = uAxis === 0 ? x0 : uAxis === 1 ? y0 : z0
    const uMax    = uAxis === 0 ? x1 : uAxis === 1 ? y1 : z1
    const vMin    = vAxis === 0 ? x0 : vAxis === 1 ? y0 : z0
    const vMax    = vAxis === 0 ? x1 : vAxis === 1 ? y1 : z1

    const uSize = uMax - uMin
    const vSize = vMax - vMin

    const neighborDelta: [number,number,number] = [0, 0, 0]
    neighborDelta[axis] = side

    for (let sl = axisMin; sl < axisMax; sl++) {
      // Build 2D mask for this slice
      const mask: (string | null)[] = new Array(uSize * vSize).fill(null)

      for (let u = 0; u < uSize; u++) {
        for (let v = 0; v < vSize; v++) {
          const pos: [number,number,number] = [0, 0, 0]
          pos[axis]  = sl
          pos[uAxis] = uMin + u
          pos[vAxis] = vMin + v

          const key = `${pos[0]},${pos[1]},${pos[2]}`
          const cell = cellMap.get(key)
          if (!cell) continue

          const np: [number,number,number] = [
            pos[0] + neighborDelta[0],
            pos[1] + neighborDelta[1],
            pos[2] + neighborDelta[2],
          ]
          const nkey = `${np[0]},${np[1]},${np[2]}`
          // Face is visible only if neighbor is not solid (allows transparent neighbors)
          if (solidSet.has(nkey)) continue

          mask[u * vSize + v] = cell.emissive ? `E:${cell.color}` : `R:${cell.color}`
        }
      }

      // Greedy merge
      const done = new Uint8Array(uSize * vSize)

      for (let u = 0; u < uSize; u++) {
        for (let v = 0; v < vSize; v++) {
          const idx = u * vSize + v
          if (done[idx] || mask[idx] === null) continue

          const faceKey = mask[idx]!

          // Extend v
          let dv = 1
          while (v + dv < vSize && mask[u * vSize + v + dv] === faceKey && !done[u * vSize + v + dv]) dv++

          // Extend u
          let du = 1
          extend: while (u + du < uSize) {
            for (let k = 0; k < dv; k++) {
              const i2 = (u + du) * vSize + v + k
              if (mask[i2] !== faceKey || done[i2]) break extend
            }
            du++
          }

          // Mark done
          for (let du2 = 0; du2 < du; du2++)
            for (let dv2 = 0; dv2 < dv; dv2++)
              done[(u + du2) * vSize + v + dv2] = 1

          // Emit quad
          const worldU = uMin + u
          const worldV = vMin + v
          const axisCoord = sl + (side > 0 ? 1 : 0)

          let q = accum.get(faceKey)
          if (!q) {
            q = { positions: [], normals: [], uvs: [], indices: [] }
            accum.set(faceKey, q)
          }

          const base = q.positions.length / 3
          const p0: [number,number,number] = [0,0,0]
          const p1: [number,number,number] = [0,0,0]
          const p2: [number,number,number] = [0,0,0]
          const p3: [number,number,number] = [0,0,0]

          p0[axis] = p1[axis] = p2[axis] = p3[axis] = axisCoord

          if (side > 0) {
            p0[uAxis] = worldU;    p0[vAxis] = worldV
            p1[uAxis] = worldU+du; p1[vAxis] = worldV
            p2[uAxis] = worldU+du; p2[vAxis] = worldV+dv
            p3[uAxis] = worldU;    p3[vAxis] = worldV+dv
          } else {
            p0[uAxis] = worldU+du; p0[vAxis] = worldV
            p1[uAxis] = worldU;    p1[vAxis] = worldV
            p2[uAxis] = worldU;    p2[vAxis] = worldV+dv
            p3[uAxis] = worldU+du; p3[vAxis] = worldV+dv
          }

          q.positions.push(...p0, ...p1, ...p2, ...p3)
          for (let k = 0; k < 4; k++) q.normals.push(...normal)
          q.uvs.push(0,0, du,0, du,dv, 0,dv)
          q.indices.push(base, base+1, base+2, base, base+2, base+3)
        }
      }
    }
  }

  const result = new Map<string, { geo: THREE.BufferGeometry; emissive: boolean }>()
  for (const [key, q] of accum) {
    if (q.indices.length === 0) continue
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(q.positions, 3))
    geo.setAttribute('normal',   new THREE.Float32BufferAttribute(q.normals, 3))
    geo.setAttribute('uv',       new THREE.Float32BufferAttribute(q.uvs, 2))
    geo.setIndex(q.indices)
    geo.computeBoundingSphere()
    result.set(key, { geo, emissive: key.startsWith('E:') })
  }
  return result
}

// ---- Chunk mesh component -----------------------------------------------

function ChunkMesh({
  chunkGeos,
}: {
  chunkGeos: Map<string, { geo: THREE.BufferGeometry; emissive: boolean }>
}) {
  const mats = useMemo(() => {
    const m = new Map<string, THREE.Material>()
    for (const [key, { geo: _geo, emissive }] of chunkGeos) {
      const colorHex = key.slice(2)
      const transparent = colorHex.length > 7
      const opacity = transparent ? 0.6 : 1
      if (emissive) {
        m.set(key, new THREE.MeshStandardMaterial({
          color: colorHex.slice(0, 7),
          emissive: colorHex.slice(0, 7),
          emissiveIntensity: 0.55,
          transparent,
          opacity,
          side: THREE.FrontSide,
        }))
      } else {
        m.set(key, new THREE.MeshLambertMaterial({
          color: colorHex.slice(0, 7),
          transparent,
          opacity,
          side: THREE.FrontSide,
        }))
      }
    }
    return m
  }, [chunkGeos])

  useEffect(() => () => { for (const mat of mats.values()) mat.dispose() }, [mats])
  useEffect(() => () => { for (const { geo } of chunkGeos.values()) geo.dispose() }, [chunkGeos])

  return (
    <>
      {Array.from(chunkGeos.entries()).map(([key, { geo }]) => {
        const mat = mats.get(key)
        if (!mat) return null
        return <mesh key={key} geometry={geo} material={mat} frustumCulled />
      })}
    </>
  )
}

// ---- VoxelMesh (chunked) ------------------------------------------------

function VoxelMesh({ blocks }: {
  blocks: BlockEntry[]
}) {
  const chunkData = useMemo(() => {
    if (blocks.length === 0) return new Map<string, Map<string, {geo: THREE.BufferGeometry; emissive: boolean}>>()

    const { cellMap, solidSet, minX, minY, minZ, maxX, maxY, maxZ } = buildCellMaps(blocks)

    const cxMin = Math.floor(minX / CHUNK_SIZE)
    const cyMin = Math.floor(minY / CHUNK_SIZE)
    const czMin = Math.floor(minZ / CHUNK_SIZE)
    const cxMax = Math.floor(maxX / CHUNK_SIZE)
    const cyMax = Math.floor(maxY / CHUNK_SIZE)
    const czMax = Math.floor(maxZ / CHUNK_SIZE)

    const chunks = new Map<string, Map<string, {geo: THREE.BufferGeometry; emissive: boolean}>>()
    for (let cx = cxMin; cx <= cxMax; cx++)
      for (let cy = cyMin; cy <= cyMax; cy++)
        for (let cz = czMin; cz <= czMax; cz++) {
          const geos = buildChunkGeometries(cellMap, solidSet, cx, cy, cz)
          if (geos.size > 0) chunks.set(`${cx},${cy},${cz}`, geos)
        }
    return chunks
  }, [blocks])

  return (
    <>
      {Array.from(chunkData.entries()).map(([key, geos]) => (
        <ChunkMesh key={key} chunkGeos={geos} />
      ))}
    </>
  )
}

// ---- Props --------------------------------------------------------------

interface VoxelRendererProps {
  blocks: BlockEntry[]
  anchors?: Anchor[]
  ports?: ConnectionPort[]
  dimensions?: Vec3
  showGrid?: boolean
  showBounds?: boolean
  showAnchors?: boolean
  showAir?: boolean
  showStats?: boolean
  layerY?: number | null
  orthographic?: boolean
  onBlockClick?: (block: BlockEntry) => void
}

// ---- Main component -----------------------------------------------------

export default function VoxelRenderer({
  blocks, anchors = [], ports = [],
  dimensions,
  showGrid = true, showBounds = true, showAnchors = true,
  showAir = false, showStats: _showStats = false,
  layerY = null,
  orthographic = false,
  onBlockClick: _onBlockClick,
}: VoxelRendererProps) {
  const [camCmd, setCamCmd] = useState<CameraCmd>({ view: 'default', n: 0 })
  const [showFPS, setShowFPS] = useState(false)
  const fpsRef = useRef<HTMLDivElement>(null)

  const visibleBlocks = useMemo(() => {
    return blocks.filter(b => {
      if (!showAir && AIR_IDS.has(b.blockId)) return false
      if (layerY !== null && b.y !== layerY) return false
      return true
    })
  }, [blocks, showAir, layerY])

  const center = useMemo(() => {
    if (!dimensions) return { x: 0, y: 0, z: 0 }
    return { x: dimensions.x / 2, y: dimensions.y / 2, z: dimensions.z / 2 }
  }, [dimensions])

  const defaultCamPos = useMemo((): [number, number, number] => {
    if (!dimensions) return [30, 30, 30]
    const dist = Math.max(dimensions.x, dimensions.y, dimensions.z) * 2.0
    const d = dist / Math.SQRT2
    return [center.x + d, center.y + d, center.z + d]
  }, [dimensions, center])

  const orthoZoom = useMemo(() => {
    if (!dimensions) return 20
    return Math.max(1, Math.min(20, 200 / Math.max(dimensions.x, dimensions.z)))
  }, [dimensions])

  function triggerView(view: CameraView) {
    setCamCmd(c => ({ view, n: c.n + 1 }))
  }

  // F key toggles FPS overlay
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') setShowFPS(v => !v)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', background: '#1a1a2e', position: 'relative' }}>
      {/* Camera control buttons */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {(['default', 'top', 'front'] as CameraView[]).map(v => (
          <button
            key={v}
            onClick={() => triggerView(v)}
            className="text-xs px-2 py-1 rounded text-gray-300 hover:text-white"
            style={{ background: 'rgba(13,17,23,0.85)', border: '1px solid #30363d' }}
          >
            {v === 'default' ? 'Reset Camera' : v === 'top' ? 'Top View' : 'Front View'}
          </button>
        ))}
      </div>

      <Canvas
        orthographic={orthographic}
        camera={orthographic
          ? { position: defaultCamPos, zoom: orthoZoom }
          : { position: defaultCamPos, fov: 45 }
        }
        frameloop="demand"
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = false
        }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 20, 10]} intensity={0.9} />
          <directionalLight position={[-10, 5, -10]} intensity={0.3} />

          <VoxelMesh blocks={visibleBlocks} />

          {showAnchors && anchors.map(a => <AnchorMarker key={a.id} anchor={a} />)}
          {showAnchors && ports.map(p => <PortMarker key={p.id} port={p} />)}

          {showBounds && dimensions && <BoundingBox dimensions={dimensions} />}

          {showGrid && (
            <Grid
              args={[200, 200]}
              position={[center.x, -0.5, center.z]}
              cellSize={1}
              cellThickness={0.5}
              cellColor="#2a2a4a"
              sectionSize={8}
              sectionThickness={1}
              sectionColor="#3a3a6a"
              fadeDistance={200}
              fadeStrength={1}
              infiniteGrid
            />
          )}

          <OrbitControls
            makeDefault
            target={[center.x, center.y, center.z]}
            minDistance={2}
          />

          <CameraController cmd={camCmd} center={center} defaultPos={defaultCamPos} />

          {showFPS && <FPSUpdater domRef={fpsRef} />}
        </Suspense>
      </Canvas>

      {showFPS && (
        <div
          ref={fpsRef}
          style={{
            position: 'absolute', bottom: 8, left: 8,
            color: '#00ff88', fontFamily: 'monospace', fontSize: 12,
            background: 'rgba(0,0,0,0.55)', padding: '2px 6px', borderRadius: 4,
            pointerEvents: 'none', zIndex: 20,
          }}
        >
          -- FPS
        </div>
      )}
    </div>
  )
}

// ---- Anchor marker ------------------------------------------------------

function AnchorMarker({ anchor }: { anchor: Anchor }) {
  const { position } = anchor
  return (
    <group position={[position.x + 0.5, position.y + 0.5, position.z + 0.5]}>
      <mesh>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
    </group>
  )
}

// ---- Port marker --------------------------------------------------------

function PortMarker({ port }: { port: ConnectionPort }) {
  const { position } = port
  const colors: Record<string, string> = {
    hallway: '#00FF88', stair: '#00CCFF', elevator: '#FF8800',
    cable: '#FFFF00', pipe: '#00FFFF', power: '#FF4444',
    item: '#8844FF', fluid: '#0088FF', facade: '#AAAAAA', decorative: '#FFAAAA',
  }
  const color = colors[port.type] ?? '#FFFFFF'
  return (
    <group position={[position.x + 0.5, position.y + 0.5, position.z + 0.5]}>
      <mesh>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
    </group>
  )
}

// ---- Bounding box -------------------------------------------------------

function BoundingBox({ dimensions }: { dimensions: Vec3 }) {
  const { x, y, z } = dimensions
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(x, y, z)
    const eg = new THREE.EdgesGeometry(g)
    g.dispose()
    return eg
  }, [x, y, z])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <lineSegments position={[x / 2, y / 2, z / 2]} geometry={geo}>
      <lineBasicMaterial color="#44AAFF" />
    </lineSegments>
  )
}
