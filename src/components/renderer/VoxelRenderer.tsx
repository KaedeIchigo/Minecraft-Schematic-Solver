import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Stats } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { BoxGeometry } from 'three'
import type { BlockEntry, Anchor, ConnectionPort, Vec3 } from '@shared/types.js'
import { getBlockColorForEntry } from '@shared/blockColors.js'

type CameraView = 'default' | 'top' | 'front'

interface CameraCmd { view: CameraView; n: number }

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
      const c = controls as unknown as { target: { set: (x: number, y: number, z: number) => void }; update: () => void }
      c.target.set(center.x, center.y, center.z)
      c.update()
    }
  }, [cmd])

  return null
}

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
  layerY?: number | null   // null = show all
  orthographic?: boolean
  onBlockClick?: (block: BlockEntry) => void
}

export default function VoxelRenderer({
  blocks, anchors = [], ports = [],
  dimensions,
  showGrid = true, showBounds = true, showAnchors = true,
  showAir = false, showStats = false,
  layerY = null,
  orthographic = false,
  onBlockClick,
}: VoxelRendererProps) {
  const [camCmd, setCamCmd] = useState<CameraCmd>({ view: 'default', n: 0 })

  const visibleBlocks = useMemo(() => {
    const airIds = new Set(['minecraft:air', 'minecraft:cave_air'])
    return blocks.filter(b => {
      if (!showAir && airIds.has(b.blockId)) return false
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
        shadows
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
          <directionalLight position={[-10, 5, -10]} intensity={0.3} />

          {/* Voxel blocks */}
          <VoxelMesh blocks={visibleBlocks} onBlockClick={onBlockClick} />

          {/* Anchors */}
          {showAnchors && anchors.map(a => (
            <AnchorMarker key={a.id} anchor={a} />
          ))}

          {/* Connection ports */}
          {showAnchors && ports.map(p => (
            <PortMarker key={p.id} port={p} />
          ))}

          {/* Bounding box */}
          {showBounds && dimensions && (
            <BoundingBox dimensions={dimensions} />
          )}

          {/* Grid */}
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

          {showStats && <Stats />}
        </Suspense>
      </Canvas>
    </div>
  )
}

// ---- Instanced voxel mesh -----------------------------------------------

const MAX_POINT_LIGHTS = 8

function VoxelMesh({ blocks, onBlockClick }: { blocks: BlockEntry[]; onBlockClick?: (b: BlockEntry) => void }) {
  const { regular, emissive, pointLights } = useMemo(() => {
    const reg  = new Map<string, BlockEntry[]>()
    const emit = new Map<string, BlockEntry[]>()
    const pts:  { x: number; y: number; z: number; color: string }[] = []

    for (const b of blocks) {
      const { color, emissive: isEmit } = getBlockColorForEntry(b)
      const map = isEmit ? emit : reg
      if (!map.has(color)) map.set(color, [])
      map.get(color)!.push(b)
      if (isEmit && pts.length < MAX_POINT_LIGHTS) pts.push({ x: b.x, y: b.y, z: b.z, color })
    }
    return { regular: reg, emissive: emit, pointLights: pts }
  }, [blocks])

  return (
    <>
      {Array.from(regular.entries()).map(([color, list]) => (
        <BlockGroup key={color} color={color} isEmissive={false} blocks={list} onBlockClick={onBlockClick} />
      ))}
      {Array.from(emissive.entries()).map(([color, list]) => (
        <BlockGroup key={`e_${color}`} color={color} isEmissive blocks={list} onBlockClick={onBlockClick} />
      ))}
      {pointLights.map((l, i) => (
        <pointLight
          key={i}
          position={[l.x + 0.5, l.y + 0.5, l.z + 0.5]}
          color={l.color}
          intensity={1.2}
          distance={8}
          decay={2}
        />
      ))}
    </>
  )
}

function BlockGroup({
  color, isEmissive, blocks, onBlockClick,
}: {
  color: string
  isEmissive: boolean
  blocks: BlockEntry[]
  onBlockClick?: (b: BlockEntry) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const transparent = color.length > 7
  const opacity = transparent ? 0.6 : 1

  return (
    <>
      {blocks.map(b => {
        const key = `${b.x},${b.y},${b.z}`
        const isHovered = hovered === key
        return (
          <mesh
            key={key}
            position={[b.x + 0.5, b.y + 0.5, b.z + 0.5]}
            onPointerEnter={() => setHovered(key)}
            onPointerLeave={() => setHovered(null)}
            onClick={() => onBlockClick?.(b)}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.98, 0.98, 0.98]} />
            {isEmissive ? (
              <meshStandardMaterial
                color={isHovered ? '#ffffff' : color}
                emissive={isHovered ? '#ffffff' : color}
                emissiveIntensity={0.55}
                transparent={transparent}
                opacity={opacity}
              />
            ) : (
              <meshLambertMaterial
                color={isHovered ? '#ffffff' : color}
                transparent={transparent}
                opacity={opacity}
              />
            )}
          </mesh>
        )
      })}
    </>
  )
}

// ---- Anchor marker -------------------------------------------------------

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

// ---- Port marker ---------------------------------------------------------

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

// ---- Bounding box --------------------------------------------------------

function BoundingBox({ dimensions }: { dimensions: Vec3 }) {
  const { x, y, z } = dimensions
  const geo = useMemo(() => new BoxGeometry(x, y, z), [x, y, z])
  return (
    <group>
      <lineSegments position={[x / 2, y / 2, z / 2]}>
        <edgesGeometry args={[geo]} />
        <lineBasicMaterial color="#44AAFF" linewidth={2} />
      </lineSegments>
    </group>
  )
}
