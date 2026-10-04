import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { chromium } from 'playwright'
import { preview } from 'vite'

const executablePath = process.env.CHROMIUM_EXECUTABLE ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)

function position(text) {
  const match = text.match(/x:([\d.-]+)\s+y:([\d.-]+)\s+z:([\d.-]+)/i)
  assert.ok(match, `expected position in ${text}`)
  return { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) }
}

/** Runs against the emitted site, including real rendering and keyboard input. */
test('courtyard route: vault, climb, then leap the roof gap', { timeout: 60000 }, async () => {
  const server = await preview({ preview: { host: '127.0.0.1', port: 0 } })
  const address = server.httpServer.address()
  assert.ok(address && typeof address !== 'string')
  let browser
  try {
    browser = await chromium.launch({ executablePath, args: ['--enable-unsafe-swiftshader'] })
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('requestfailed', request => errors.push(`request failed: ${request.url()}`))
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'networkidle' })
    await page.locator('.homepage-play').click()
    await page.keyboard.press('F3')
    const value = async label => page.locator('.debug-hud > div')
      .filter({ has: page.locator('span', { hasText: new RegExp(`^${label}$`) }) })
      .locator('strong').innerText()
    const waitForZ = async (threshold, timeout = 6000) => page.waitForFunction(value => {
      const row = [...document.querySelectorAll('.debug-hud > div')]
        .find(element => element.querySelector('span')?.textContent === 'Pos')
      return Number(row?.querySelector('strong')?.textContent?.match(/z:([\d.-]+)/i)?.[1]) > value
    }, threshold, { timeout })
    const waitForNote = async text => page.waitForFunction(value => [...document.querySelectorAll('.debug-hud > div')]
      .some(row => row.querySelector('span')?.textContent === 'Note' && row.querySelector('strong')?.textContent?.toLowerCase().includes(value)), text, { timeout: 3500 })
    const waitForGround = async () => page.waitForFunction(() => [...document.querySelectorAll('.debug-hud > div')]
      .some(row => row.querySelector('span')?.textContent === 'Grounded' && row.querySelector('strong')?.textContent?.toLowerCase() === 'true'), null, { timeout: 3500 })

    assert.match(await value('Respawn'), /Courtyard Run-Up/i)
    assert.equal(position(await value('Pos')).z, -138)
    await page.keyboard.down('KeyW')
    await page.waitForFunction(() => document.querySelector('.route-hint')?.textContent?.includes('SPACE · Vault'), null, { timeout: 6000 })
    await page.keyboard.press('Space')
    await waitForNote('courtyard-first-vault')
    await page.keyboard.up('KeyW')
    await waitForGround()
    assert.ok(position(await value('Pos')).z > -132.5, 'first barrier crossed')

    await page.keyboard.down('KeyW')
    await waitForZ(-120)
    await page.keyboard.press('Space')
    await waitForNote('courtyard-second-vault')
    await page.keyboard.up('KeyW')
    await waitForGround()
    assert.ok(position(await value('Pos')).z > -118.5, 'second barrier crossed')

    await page.keyboard.down('KeyW')
    await waitForZ(-108.65)
    await page.keyboard.press('Space')
    await page.waitForFunction(() => [...document.querySelectorAll('.debug-hud > div')]
      .some(row => row.querySelector('span')?.textContent === 'State' && row.querySelector('strong')?.textContent?.toLowerCase() === 'climb'), null, { timeout: 2500 })
    await page.keyboard.up('KeyW')
    await waitForNote('climb_top')
    assert.ok(position(await value('Pos')).y > 7, 'reached rooftop')

    await page.keyboard.down('ShiftLeft')
    await page.keyboard.down('KeyW')
    await page.waitForFunction(() => document.querySelector('.route-hint')?.textContent?.includes('SPACE · Leap'), null, { timeout: 5000 })
    await page.keyboard.press('Space')
    await waitForNote('leap')
    await page.waitForFunction(() => {
      const rows = [...document.querySelectorAll('.debug-hud > div')]
      const current = label => rows.find(row => row.querySelector('span')?.textContent === label)?.querySelector('strong')?.textContent ?? ''
      return current('Grounded').toLowerCase() === 'true' && current('Surface').toLowerCase().includes('north arcade roof')
    }, null, { timeout: 5000 })
    await page.keyboard.up('KeyW')
    await page.keyboard.up('ShiftLeft')
    assert.ok(position(await value('Pos')).z > -95, 'landed across the gap')
    assert.deepEqual(errors, [])
  } finally {
    await browser?.close()
    await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()))
  }
})
