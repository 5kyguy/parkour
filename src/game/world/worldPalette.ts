import { MeshStandardMaterial } from 'three'
import type { MaterialKind } from './worldTypes'

const MATERIAL_CONFIG: Record<
  MaterialKind,
  {
    color: string
    roughness: number
    metalness?: number
  }
> = {
  streetStone: {
    color: '#B8A48C',
    roughness: 0.98,
  },
  plazaStone: {
    color: '#CBB496',
    roughness: 0.92,
  },
  stucco: {
    color: '#E8DCC8',
    roughness: 1,
  },
  brick: {
    color: '#A85239',
    roughness: 0.96,
  },
  stone: {
    color: '#8B7D6B',
    roughness: 0.9,
  },
  roofTile: {
    color: '#C45C3E',
    roughness: 0.95,
  },
  wood: {
    color: '#7B5735',
    roughness: 0.92,
  },
  cloth: {
    color: '#A83C3C',
    roughness: 1,
  },
  foliage: {
    color: '#6B8E4E',
    roughness: 1,
  },
}

export function createWorldMaterial(kind: MaterialKind): MeshStandardMaterial {
  const config = MATERIAL_CONFIG[kind]
  return new MeshStandardMaterial({
    color: config.color,
    roughness: config.roughness,
    metalness: config.metalness ?? 0.05,
  })
}
