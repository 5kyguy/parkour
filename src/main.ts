import './styles/main.css'
import { GameApp } from './game/gameApp'

const builderIconUrl = new URL('../assets/profile.jpg', import.meta.url).href
const appRoot = document.querySelector<HTMLDivElement>('#app')

if (!appRoot) {
  throw new Error('Could not find #app root element.')
}

const game = new GameApp(appRoot)
game.start()

const builderCredit = document.createElement('a')
builderCredit.className = 'builder-credit'
builderCredit.href = 'https://x.com/0x5kyguy'
builderCredit.target = '_blank'
builderCredit.rel = 'noopener noreferrer'
builderCredit.innerHTML = [
  '<span>Being built by</span>',
  `<img src="${builderIconUrl}" alt="0x5kyguy profile" />`,
].join('')
appRoot.appendChild(builderCredit)

const homepage = document.createElement('section')
homepage.className = 'homepage-overlay'
homepage.innerHTML = [
  '<div class="homepage-panel">',
  '<p class="homepage-kicker">Parkour Vibe Jam 2026</p>',
  '<h1>Michael in Florence</h1>',
  '<p class="homepage-subtitle">An accidental office manager. A city of rooftops. A very confident lack of training.</p>',
  '<p class="homepage-copy">One moment Michael Scott was in a Dunder Mifflin conference room. The next, he woke up in 15th-century Florence wearing his polo, badge, and an unshakable belief that he was born to free-run.</p>',
  '<button type="button" class="homepage-play">Play</button>',
  '<p class="homepage-controls">WASD / Arrows: Move · Space: Jump · Shift: Sprint · R: Respawn</p>',
  '</div>',
].join('')
appRoot.appendChild(homepage)

const playButton = homepage.querySelector<HTMLButtonElement>('.homepage-play')
if (!playButton) {
  throw new Error('Could not find homepage play button.')
}

playButton.addEventListener('click', async () => {
  playButton.disabled = true
  await game.startPlaying()
  homepage.remove()
})
