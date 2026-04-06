import './styles/main.css'
import { GameApp } from './game/gameApp'

const appRoot = document.querySelector<HTMLDivElement>('#app')

if (!appRoot) {
  throw new Error('Could not find #app root element.')
}

const game = new GameApp(appRoot)
game.start()
