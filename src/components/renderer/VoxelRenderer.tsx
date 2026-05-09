import { Canvas, useFrame, useThree, invalidate } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Anchor, BlockEntry, ConnectionPort, RoomBounds, Vec3 } from '@shared/types.js'
import { getBlockColorForEntry } from '@shared/blockColors.js'
import { getAllEntries } from '@shared/blockRegistry.js'

// ---- Constants ----------------------------------------------------------

const AIR_IDS = new Set(['minecraft:air', 'minecraft:cave_air'])
const FACE_EPSILON = 0.001

type CameraView = 'default' | 'top' | 'front'
interface CameraCmd { view: CameraView; n: number }

type FaceId = 'east' | 'west' | 'up' | 'down' | 'south' | 'north'

interface FaceDef {
  id: FaceId
  normal: [number, number, number]
  rotation: [number, number, number]
}

const FACE_DEFS: FaceDef[] = [
  { id: 'east',  normal: [ 1,  0,  0], rotation: [0, Math.PI / 2, 0] },
  { id: 'west',  normal: [-1,  0,  0], rotation: [0, -Math.PI / 2, 0] },
  { id: 'up',    normal: [ 0,  1,  0], rotation: [-Math.PI / 2, 0, 0] },
  { id: 'down',  normal: [ 0, -1,  0], rotation: [Math.PI / 2, 0, 0] },
  { id: 'south', normal: [ 0,  0,  1], rotation: [0, 0, 0] },
  { id: 'north', normal: [ 0,  0, -1], rotation: [0, Math.PI, 0] },
]

interface RegistryInfo {
  displayName: string
  category: string
}

const REGISTRY_BY_BLOCK_ID = new Map<string, RegistryInfo>()
for (const entry of getAllEntries()) {
  if (!REGISTRY_BY_BLOCK_ID.has(entry.blockId)) {
    REGISTRY_BY_BLOCK_ID.set(entry.blockId, {
      displayName: entry.displayName,
      category: entry.category,
    })
  }
}

// ---- Camera / stats -----------------------------------------------------

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
  }, [camera, center, cmd, controls, defaultPos])

  return null
}

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

// ---- Instanced exposed faces -------------------------------------------
// TODO: Greedy meshing can be re-attempted later. For now, exposed face
// instancing is the stable foundation: no cross-layer merged quads, no torn
// geometry, and a direct instanceId -> block lookup for inspection.

interface BlockRenderInfo {
  block: BlockEntry
  color: string
  emissive: boolean
  transparent: boolean
}

interface FaceInstance {
  block: BlockEntry
  face: FaceDef
}

interface FaceGroup {
  key: string
  color: string
  emissive: boolean
  transparent: boolean
  instances: FaceInstance[]
}

interface RaycastTarget {
  mesh: THREE.InstancedMesh
  lookup: BlockEntry[]
}

function posKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`
}

function blockStateKey(block: BlockEntry): string {
  const state = Object.entries(block.blockState ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(',')
  return `${block.blockId}|${state}`
}

function makeGroupKey(info: BlockRenderInfo): string {
  return `${blockStateKey(info.block)}|${info.color}|${info.emissive ? 'E' : 'R'}`
}

function buildFaceGroups(blocks: BlockEntry[]): FaceGroup[] {
  const blockMap = new Map<string, BlockRenderInfo>()
  const solidSet = new Set<string>()

  for (const block of blocks) {
    if (AIR_IDS.has(block.blockId)) continue
    const colorEntry = getBlockColorForEntry(block)
    const color = colorEntry.color || '#888888'
    const transparent = color.length > 7
    const info: BlockRenderInfo = {
      block,
      color,
      emissive: !!colorEntry.emissive,
      transparent,
    }
    blockMap.set(posKey(block.x, block.y, block.z), info)
    if (!transparent) solidSet.add(posKey(block.x, block.y, block.z))
  }

  const groups = new Map<string, FaceGroup>()
  for (const info of blockMap.values()) {
    for (const face of FACE_DEFS) {
      const neighbor = posKey(
        info.block.x + face.normal[0],
        info.block.y + face.normal[1],
        info.block.z + face.normal[2],
      )
      if (solidSet.has(neighbor)) continue

      const key = makeGroupKey(info)
      let group = groups.get(key)
      if (!group) {
        group = {
          key,
          color: info.color,
          emissive: info.emissive,
          transparent: info.transparent,
          instances: [],
        }
        groups.set(key, group)
      }
      group.instances.push({ block: info.block, face })
    }
  }

  return Array.from(groups.values())
}

function applyFaceMatrix(object: THREE.Object3D, instance: FaceInstance) {
  const { block, face } = instance
  object.position.set(
    block.x + 0.5 + face.normal[0] * (0.5 + FACE_EPSILON),
    block.y + 0.5 + face.normal[1] * (0.5 + FACE_EPSILON),
    block.z + 0.5 + face.normal[2] * (0.5 + FACE_EPSILON),
  )
  object.rotation.set(face.rotation[0], face.rotation[1], face.rotation[2])
  object.scale.set(1, 1, 1)
  object.updateMatrix()
}

function InstancedFaceMesh({ group, targetsRef }: {
  group: FaceGroup
  targetsRef: React.MutableRefObject<RaycastTarget[]>
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const material = useMemo(() => {
    const color = group.color.slice(0, 7)
    const opacity = group.transparent ? 0.6 : 1
    if (group.emissive) {
      return new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.55,
        transparent: group.transparent,
        opacity,
        depthWrite: !group.transparent,
        side: THREE.DoubleSide,
      })
    }
    return new THREE.MeshLambertMaterial({
      color,
      transparent: group.transparent,
      opacity,
      depthWrite: !group.transparent,
      side: THREE.DoubleSide,
    })
  }, [group.color, group.emissive, group.transparent])

  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const temp = new THREE.Object3D()
    for (let i = 0; i < group.instances.length; i++) {
      applyFaceMatrix(temp, group.instances[i])
      mesh.setMatrixAt(i, temp.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingBox()
    mesh.computeBoundingSphere()
    mesh.userData.blockLookup = group.instances.map(i => i.block)
    invalidate()
  }, [group.instances])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const target = { mesh, lookup: group.instances.map(i => i.block) }
    targetsRef.current = targetsRef.current.filter(t => t.mesh !== mesh).concat(target)
    return () => {
      targetsRef.current = targetsRef.current.filter(t => t.mesh !== mesh)
    }
  }, [group.instances, targetsRef])

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, group.instances.length]}
      frustumCulled
    />
  )
}

function VoxelMesh({ blocks, targetsRef }: {
  blocks: BlockEntry[]
  targetsRef: React.MutableRefObject<RaycastTarget[]>
}) {
  const groups = useMemo(() => buildFaceGroups(blocks), [blocks])

  return (
    <>
      {groups.map(group => (
        <InstancedFaceMesh key={group.key} group={group} targetsRef={targetsRef} />
      ))}
    </>
  )
}

function RaycastController({ targetsRef, onPick }: {
  targetsRef: React.MutableRefObject<RaycastTarget[]>
  onPick: (block: BlockEntry | null, screen: { x: number; y: number }) => void
}) {
  const { camera, gl } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const mouse = useMemo(() => new THREE.Vector2(), [])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const rect = gl.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)

      const targets = targetsRef.current.filter(t => t.mesh.parent)
      const hits = raycaster.intersectObjects(targets.map(t => t.mesh), false)
      const hit = hits.find(h => typeof h.instanceId === 'number')
      if (!hit || typeof hit.instanceId !== 'number') {
        onPick(null, { x: event.clientX, y: event.clientY })
        return
      }

      const target = targets.find(t => t.mesh === hit.object)
      onPick(target?.lookup[hit.instanceId] ?? null, { x: event.clientX, y: event.clientY })
    }

    gl.domElement.addEventListener('click', handleClick)
    return () => gl.domElement.removeEventListener('click', handleClick)
  }, [camera, gl.domElement, mouse, onPick, raycaster, targetsRef])

  return null
}

// ---- Selection helpers --------------------------------------------------

interface SelectionState {
  block: BlockEntry
  x: number
  y: number
  displayName: string
  category: string
  roomName: string
  color: string
}

function fallbackDisplayName(blockId: string): string {
  const name = blockId.split(':').pop() ?? blockId
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getBlockInfo(block: BlockEntry): RegistryInfo {
  return REGISTRY_BY_BLOCK_ID.get(block.blockId) ?? {
    displayName: fallbackDisplayName(block.blockId),
    category: 'unknown',
  }
}

function findRoomForBlock(block: BlockEntry, roomBounds: RoomBounds[]): string {
  const room = roomBounds.find(r =>
    block.x >= r.min.x && block.x <= r.max.x &&
    block.y >= r.min.y && block.y <= r.max.y &&
    block.z >= r.min.z && block.z <= r.max.z
  )
  if (!room) return 'Unknown'
  return `${room.label || room.id} (${room.type})`
}

function SelectionTooltip({ selection }: { selection: SelectionState }) {
  return (
    <div
      className="absolute z-20 rounded text-xs shadow-lg"
      style={{
        left: selection.x + 12,
        top: selection.y + 12,
        maxWidth: 320,
        background: 'rgba(13,17,23,0.95)',
        border: '1px solid #30363d',
        color: '#d1d5db',
        padding: '10px 12px',
        pointerEvents: 'none',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-block w-3 h-3 rounded-sm border border-gray-500"
          style={{ background: selection.color }}
        />
        <span className="font-semibold text-white">{selection.displayName}</span>
      </div>
      <div className="font-mono text-gray-300">{selection.block.blockId}</div>
      <div className="text-gray-400">Position: {selection.block.x}, {selection.block.y}, {selection.block.z}</div>
      <div className="text-gray-400">Category: {selection.category}</div>
      <div className="text-gray-400">Room: {selection.roomName}</div>
    </div>
  )
}

function SelectedBlockHighlight({ block }: { block: BlockEntry }) {
  const geometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1.04, 1.04, 1.04)
    const edges = new THREE.EdgesGeometry(box)
    box.dispose()
    return edges
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <lineSegments position={[block.x + 0.5, block.y + 0.5, block.z + 0.5]} geometry={geometry}>
      <lineBasicMaterial color="#ffffff" depthTest={false} />
    </lineSegments>
  )
}

// ---- Props --------------------------------------------------------------

interface VoxelRendererProps {
  blocks: BlockEntry[]
  anchors?: Anchor[]
  ports?: ConnectionPort[]
  roomBounds?: RoomBounds[]
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
  blocks, anchors = [], ports = [], roomBounds = [],
  dimensions,
  showGrid = true, showBounds = true, showAnchors = true,
  showAir = false, showStats = false,
  layerY = null,
  orthographic = false,
  onBlockClick,
}: VoxelRendererProps) {
  const [camCmd, setCamCmd] = useState<CameraCmd>({ view: 'default', n: 0 })
  const [showFPS, setShowFPS] = useState(showStats)
  const [selection, setSelection] = useState<SelectionState | null>(null)
  const fpsRef = useRef<HTMLDivElement>(null)
  const raycastTargetsRef = useRef<RaycastTarget[]>([])

  useEffect(() => setShowFPS(showStats), [showStats])

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

  const handlePick = useCallback((block: BlockEntry | null, screen: { x: number; y: number }) => {
    if (!block) {
      setSelection(null)
      return
    }
    const info = getBlockInfo(block)
    const color = getBlockColorForEntry(block).color.slice(0, 7)
    setSelection({
      block,
      x: screen.x,
      y: screen.y,
      displayName: info.displayName,
      category: info.category,
      roomName: findRoomForBlock(block, roomBounds),
      color,
    })
    onBlockClick?.(block)
  }, [onBlockClick, roomBounds])

  function triggerView(view: CameraView) {
    setCamCmd(c => ({ view, n: c.n + 1 }))
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') setShowFPS(v => !v)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div
      style={{ width: '100%', height: '100%', background: '#1a1a2e', position: 'relative' }}
      onMouseLeave={() => setSelection(null)}
    >
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

          <VoxelMesh blocks={visibleBlocks} targetsRef={raycastTargetsRef} />
          <RaycastController targetsRef={raycastTargetsRef} onPick={handlePick} />

          {selection && <SelectedBlockHighlight block={selection.block} />}

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

      {selection && <SelectionTooltip selection={selection} />}

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

// ---- Anchor / port / bounds overlays -----------------------------------

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
