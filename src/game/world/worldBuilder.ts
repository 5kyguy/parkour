import {
  BoxGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  Vector3,
} from 'three'
import { WORLD } from '../constants'

export class WorldBuilder {
  public readonly spawnPoint = new Vector3(0, WORLD.ROOFTOP_Y + 1.1, 0)

  public build(scene: Scene): void {
    scene.background = new Color('#87CEEB')

    const hemi = new HemisphereLight('#87CEEB', '#C45C3E', 0.35)
    scene.add(hemi)

    const sun = new DirectionalLight('#F4C430', 1.1)
    sun.position.set(-60, 120, 40)
    scene.add(sun)

    const ground = new Mesh(
      new PlaneGeometry(WORLD.WIDTH, WORLD.DEPTH),
      new MeshStandardMaterial({ color: '#B8A48C' }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = WORLD.GROUND_Y
    ground.receiveShadow = true
    scene.add(ground)

    const rooftop = new Mesh(
      new BoxGeometry(28, 1, 28),
      new MeshStandardMaterial({ color: '#C45C3E' }),
    )
    rooftop.position.set(0, WORLD.ROOFTOP_Y - 0.5, 0)
    scene.add(rooftop)

    const landmark = new Mesh(
      new BoxGeometry(18, 16, 18),
      new MeshStandardMaterial({ color: '#8B7D6B' }),
    )
    landmark.position.set(48, 8, -48)
    scene.add(landmark)
  }
}
