import { Canvas, useThree, useFrame, invalidate } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import React, { Suspense, useEffect, useMemo, useState, useRef } from 'react'
import * as THREE from 'three'
import type { BlockEntry, Anchor, ConnectionPort, Vec3 } from '@shared/types.js'
import { getBlockColorForEntry } from '@shared/blockColors.js'
import { findEntryById } from '@shared/blockRegistry.js'

// ---- Constants ----------------------------------------------------------

const AIR_IDS = new Set(['minecraft:air', 'minecraft:cave_air'])
// Shared geometry — one box for all instanced meshes
const BOX_GEO = new THREE.BoxGeometry(1, 1, 1)

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

// ---- Block instance data ------------------------------------------------

interface InstanceGroup {
  color: string
  emissive: boolean
  blocks: BlockEntry[]
}

interface RoomBound {
  id: string
  label: string
  type: string
  min: Vec3
  max: Vec3
}

// Build instance groups: group exposed blocks by (color, emissive).
// A block is "exposed" if at least one of its 6 neighbors is not solid.
// TODO: greedy meshing can be re-attempted here for further draw-call reduction.
function buildInstanceGroups(blocks: BlockEntry[]): InstanceGroup[] {
  const solidSet = new Set<string>()
  const cellInfo = new Map<string, { color: string; emissive: boolean }>()

  for (const b of blocks) {
    if (AIR_IDS.has(b.blockId)) continue
    const { color, emissive } = getBlockColorForEntry(b)
    const transparent = color.length > 7
    const key = `${b.x},${b.y},${b.z}`
    cellInfo.set(key, { color, emissive: !!emissive })
    if (!transparent) solidSet.add(key)
  }

  const DIRS: [number, number, number][] = [
    [1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],
  ]

  const groupMap = new Map<string, BlockEntry[]>()

  for (const b of blocks) {
    if (AIR_IDS.has(b.blockId)) continue
    const info = cellInfo.get(`${b.x},${b.y},${b.z}`)
    if (!info) continue

    // Skip fully enclosed blocks (all 6 neighbors solid) — they contribute no visible faces
    const exposed = DIRS.some(([dx,dy,dz]) =>
      !solidSet.has(`${b.x+dx},${b.y+dy},${b.z+dz}`)
    )
    if (!exposed) continue

    const key = info.emissive ? `E:${info.color}` : `R:${info.color}`
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(b)
  }

  return Array.from(groupMap.entries()).map(([key, blks]) => ({
    color: key.slice(2),
    emissive: key.startsWith('E:'),
    blocks: blks,
  }))
}

// ---- Selected block info ------------------------------------------------

interface SelectedInfo {
  block: BlockEntry
  mouseX: number
  mouseY: number
}

// ---- InstancedBlockGroup ------------------------------------------------

function InstancedBlockGroup({
  group,
  onHit,
}: {
  group: InstanceGroup
  onHit: (block: BlockEntry, mouseX: number, mouseY: number) => void
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const mat = useMemo(() => {
    const transparent = group.color.length > 7
    const col = group.color.slice(0, 7)
    const opacity = transparent ? 0.6 : 1
    if (group.emissive) {
      return new THREE.MeshStandardMaterial({
        color: col, emissive: col, emissiveIntensity: 0.55,
        transparent, opacity,
      })
    }
    return new THREE.MeshLambertMaterial({ color: col, transparent, opacity })
  }, [group.color, group.emissive])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    group.blocks.forEach((b, i) => {
      m.makeTranslation(b.x + 0.5, b.y + 0.5, b.z + 0.5)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    invalidate()
  }, [group.blocks])

  useEffect(() => () => mat.dispose(), [mat])

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    if (e.instanceId === undefined) return
    const block = group.blocks[e.instanceId]
    if (block) onHit(block, e.nativeEvent.clientX, e.nativeEvent.clientY)
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[BOX_GEO, mat, group.blocks.length]}
      onClick={handleClick}
    />
  )
}

// ---- Wireframe selection highlight --------------------------------------

function SelectionHighlight({ block }: { block: BlockEntry }) {
  const geo = useMemo(() => {
    const box = new THREE.BoxGeometry(1.04, 1.04, 1.04)
    const edges = new THREE.EdgesGeometry(box)
    box.dispose()
    return edges
  }, [])
  useEffect(() => () => geo.dispose(), [geo])

  return (
    <lineSegments
      position={[block.x + 0.5, block.y + 0.5, block.z + 0.5]}
      geometry={geo}
    >
      <lineBasicMaterial color="#ffffff" />
    </lineSegments>
  )
}

// ---- VoxelMesh (instanced) ----------------------------------------------

function VoxelMesh({
  blocks,
  onHit,
  selected,
}: {
  blocks: BlockEntry[]
  onHit: (block: BlockEntry, mx: number, my: number) => void
  selected: BlockEntry | null
}) {
  const groups = useMemo(() => buildInstanceGroups(blocks), [blocks])

  return (
    <>
      {groups.map((g, i) => (
        <InstancedBlockGroup key={i} group={g} onHit={onHit} />
      ))}
      {selected && <SelectionHighlight block={selected} />}
    </>
  )
}

// ---- Tooltip component --------------------------------------------------

function BlockTooltip({
  info,
  roomBounds,
  containerRef,
}: {
  info: SelectedInfo
  roomBounds: RoomBound[]
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const { block, mouseX, mouseY } = info
  const entry = findEntryById(block.blockId)

  const room = roomBounds.find(r =>
    block.x >= r.min.x && block.x <= r.max.x &&
    block.y >= r.min.y && block.y <= r.max.y &&
    block.z >= r.min.z && block.z <= r.max.z
  )

  const { color } = getBlockColorForEntry(block)
  const swatchColor = color.slice(0, 7)

  // Convert client coords to container-relative
  const rect = containerRef.current?.getBoundingClientRect()
  let tx = mouseX - (rect?.left ?? 0) + 12
  let ty = mouseY - (rect?.top ?? 0) + 12
  // Clamp so tooltip stays inside container
  if (rect) {
    if (tx + 240 > rect.width)  tx = mouseX - (rect.left) - 252
    if (ty + 180 > rect.height) ty = mouseY - (rect.top)  - 192
  }

  return (
    <div
      style={{
        position: 'absolute', left: tx, top: ty,
        background: 'rgba(13,17,23,0.95)',
        border: '1px solid #30363d',
        borderRadius: 6, padding: '8px 10px',
        fontFamily: 'monospace', fontSize: 11,
        color: '#c9d1d9', zIndex: 50,
        pointerEvents: 'none', minWidth: 220,
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
      }}
    >
      {/* Color swatch + block id */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{
          width: 14, height: 14, borderRadius: 2,
          background: swatchColor, border: '1px solid #444', flexShrink: 0,
        }} />
        <span style={{ color: '#58a6ff', wordBreak: 'break-all' }}>{block.blockId}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 8px' }}>
        <span style={{ color: '#8b949e' }}>Name</span>
        <span>{entry?.displayName ?? '—'}</span>
        <span style={{ color: '#8b949e' }}>Category</span>
        <span>{entry?.category ?? '—'}</span>
        <span style={{ color: '#8b949e' }}>Position</span>
        <span>({block.x}, {block.y}, {block.z})</span>
        <span style={{ color: '#8b949e' }}>Room</span>
        <span>{room ? room.label || room.id : '—'}</span>
      </div>
    </div>
  )
}

// ---- Props --------------------------------------------------------------

interface VoxelRendererProps {
  blocks: BlockEntry[]
  anchors?: Anchor[]
  ports?: ConnectionPort[]
  dimensions?: Vec3
  roomBounds?: RoomBound[]
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
  roomBounds = [],
  showGrid = true, showBounds = true, showAnchors = true,
  showAir = false, showStats: _showStats = false,
  layerY = null,
  orthographic = false,
  onBlockClick,
}: VoxelRendererProps) {
  const [camCmd, setCamCmd] = useState<CameraCmd>({ view: 'default', n: 0 })
  const [showFPS, setShowFPS] = useState(false)
  const [selected, setSelected] = useState<SelectedInfo | null>(null)
  const fpsRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  function handleHit(block: BlockEntry, mx: number, my: number) {
    setSelected({ block, mouseX: mx, mouseY: my })
    onBlockClick?.(block)
    invalidate()
  }

  function handleCanvasClick() {
    // Dismiss tooltip on background click (no stopPropagation from mesh)
  }

  // F key toggles FPS
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') setShowFPS(v => !v)
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#1a1a2e', position: 'relative' }}
      onClick={handleCanvasClick}
    >
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
        onCreated={({ gl }) => { gl.shadowMap.enabled = false }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 20, 10]} intensity={0.9} />
          <directionalLight position={[-10, 5, -10]} intensity={0.3} />

          <VoxelMesh
            blocks={visibleBlocks}
            onHit={handleHit}
            selected={selected?.block ?? null}
          />

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
            onChange={() => { if (selected) invalidate() }}
          />

          <CameraController cmd={camCmd} center={center} defaultPos={defaultCamPos} />

          {showFPS && <FPSUpdater domRef={fpsRef} />}
        </Suspense>
      </Canvas>

      {/* Block tooltip */}
      {selected && (
        <BlockTooltip
          info={selected}
          roomBounds={roomBounds}
          containerRef={containerRef}
        />
      )}

      {/* FPS overlay */}
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
