import './style.css'

const defaultState = {
  hunger: 80,
  happiness: 75,
  cleanliness: 90,
  energy: 85,

  bornAt: Date.now(),
  lastUpdated: Date.now(),

  stage: 'egg',

  feedCount: 0,
  playCount: 0,
  washCount: 0,
  sleepCount: 0,

  neglectMinutes: 0,
}

let pet = loadPet()

function clamp(value) {
  return Math.max(0, Math.min(100, value))
}

function loadPet() {
  const saved = localStorage.getItem('my-tamagotchi')

  if (!saved) {
    return { ...defaultState }
  }

  try {
    const parsed = JSON.parse(saved)
    const now = Date.now()

    const elapsedMinutes = Math.floor(
      (now - parsed.lastUpdated) / 1000 / 60
    )

    if (elapsedMinutes > 0) {
      parsed.hunger = clamp(parsed.hunger - elapsedMinutes * 0.5)
      parsed.happiness = clamp(parsed.happiness - elapsedMinutes * 0.2)
      parsed.cleanliness = clamp(parsed.cleanliness - elapsedMinutes * 0.3)
      parsed.energy = clamp(parsed.energy - elapsedMinutes * 0.25)

      const average =
        (
          parsed.hunger +
          parsed.happiness +
          parsed.cleanliness +
          parsed.energy
        ) / 4

      if (average < 35) {
        parsed.neglectMinutes =
          (parsed.neglectMinutes || 0) + elapsedMinutes
      }
    }

    parsed.lastUpdated = now

    return {
      ...defaultState,
      ...parsed,
    }

  } catch {
    return { ...defaultState }
  }
}

function savePet() {
  pet.lastUpdated = Date.now()

  localStorage.setItem(
    'my-tamagotchi',
    JSON.stringify(pet)
  )
}

function getAgeMinutes() {
  return Math.floor(
    (Date.now() - pet.bornAt) / 1000 / 60
  )
}

function getDay() {
  return Math.floor(getAgeMinutes() / 1440) + 1
}

function updateEvolution() {
  const age = getAgeMinutes()

  // 테스트용
  // 1분 : 알 → 아기
  if (pet.stage === 'egg' && age >= 1) {
    pet.stage = 'baby'
    savePet()
  }

  // 2분 : 아기 → 어린이
  if (pet.stage === 'baby' && age >= 2) {
    pet.stage = 'child'
    savePet()
  }

  // 3분 : 어린이 → 최종 진화
  if (pet.stage === 'child' && age >= 3) {
    pet.stage = chooseEvolution()
    savePet()
  }
}

function chooseEvolution() {
  const totalActions =
    pet.feedCount +
    pet.playCount +
    pet.washCount +
    pet.sleepCount

  const average =
    (
      pet.hunger +
      pet.happiness +
      pet.cleanliness +
      pet.energy
    ) / 4

  const maxAction = Math.max(
    pet.feedCount,
    pet.playCount,
    pet.washCount,
    pet.sleepCount
  )

  const minAction = Math.min(
    pet.feedCount,
    pet.playCount,
    pet.washCount,
    pet.sleepCount
  )

  const actionGap = maxAction - minAction


  /* ==================================
     1. 녹아버린
     청결/체력 둘 다 박살 + 방치
  ================================== */

  if (
    pet.cleanliness <= 20 &&
    pet.energy <= 25 &&
    pet.neglectMinutes >= 5
  ) {
    return 'melted'
  }


  /* ==================================
     2. 흑꺢
     오래 방치됐고 전체 상태도 좋지 않음
  ================================== */

  if (
    pet.neglectMinutes >= 8 &&
    average <= 45
  ) {
    return 'dark'
  }


  /* ==================================
     3. 미치광이
     한 행동에 심하게 과몰입
  ================================== */

  if (
    totalActions >= 8 &&
    actionGap >= 6
  ) {
    return 'crazy'
  }


  /* ==================================
     4. 먹보
     밥을 압도적으로 많이 줌
  ================================== */

  if (
    pet.feedCount >= 5 &&
    pet.feedCount > pet.playCount &&
    pet.feedCount > pet.washCount &&
    pet.feedCount > pet.sleepCount
  ) {
    return 'chubby'
  }


  /* ==================================
     5. 장난꾸러기
     놀기를 압도적으로 많이 함
  ================================== */

  if (
    pet.playCount >= 5 &&
    pet.playCount > pet.feedCount &&
    pet.playCount > pet.washCount &&
    pet.playCount > pet.sleepCount
  ) {
    return 'playful'
  }


  /* ==================================
     6. 젠틀
     모든 돌봄을 골고루 잘함
  ================================== */

  if (
    totalActions >= 8 &&
    actionGap <= 2 &&
    average >= 70
  ) {
    return 'gentle'
  }


  /* ==================================
     7. 그냥
     어디에도 특별히 해당하지 않음
  ================================== */

  return 'basic'
}

function getStageName() {
  const names = {
    egg: '알',
    baby: '아기',
    playful: '장난꾸러기',
    chubby: '먹보',
    gentle: '젠틀',
    crazy: '미치광이',
    basic: '그냥',
    dark: '흑꺢',
    melted: '녹아버린'
  }

  return names[pet.stage] || ''
}

function getMood() {
  if (pet.stage === 'egg') {
    return '씨발 곧 태어날 것 같아!!!'
  }

  const average =
    (
      pet.hunger +
      pet.happiness +
      pet.cleanliness +
      pet.energy
    ) / 4

  if (average >= 80) {
    return '꺢이다~!'
  }

  if (average >= 60) {
    return '기분 좋두!'
  }

  if (average >= 40) {
    return '조금 심심해...'
  }

  if (average >= 20) {
    return '나 좀 꺢해줘...'
  }

  return '나 지금 물에빠진 두엉이야...'
}

function getCharacterHTML() {
  if (pet.stage === 'egg') {
    const age = getAgeMinutes()
    const crackClass = age >= 1 ? 'cracking' : ''

    return `
      <div class="egg-character ${crackClass}">
        <div class="egg-shell">
          <div class="egg-crack crack-one"></div>
          <div class="egg-crack crack-two"></div>
          <div class="egg-crack crack-three"></div>
        </div>
      </div>
    `
  }

  return `
  <div class="kkaek-character ${
    pet.stage === 'dark'
      ? 'basic dark'
      : pet.stage === 'melted'
      ? 'basic melted'
      : pet.stage
  }">

  <!-- 어린 꺢용 발 -->
  <div class="kkaek-feet">
    <div class="kkaek-foot left"></div>
    <div class="kkaek-foot right"></div>
  </div>

  <!-- 몸통 -->
  <div class="kkaek-body"></div>

  <!-- 성체용 팔 -->
  <div class="kkaek-arms">
    <div class="kkaek-arm left"></div>
    <div class="kkaek-arm right"></div>
  </div>

  <!-- 성체용 다리 -->
  <div class="kkaek-legs">
    <div class="kkaek-leg left"></div>
    <div class="kkaek-leg right"></div>
  </div>

  <div class="kkaek-head">

        <svg
          class="kkaek-eyes"
          viewBox="0 0 60 30"
          aria-hidden="true"
        >
          <path
            d="M 10 23
               C 10 13, 15 8, 21 8
               C 27 8, 30 14, 30 22
               C 30 14, 33 8, 39 8
               C 45 8, 50 13, 50 23"
          />
        </svg>

        <svg
          class="kkaek-mouth"
          viewBox="0 0 120 70"
          aria-hidden="true"
        >
          <path
            d="M 10 12
               C 12 44, 31 58, 60 58
               C 89 58, 108 44, 110 12"
          />
        </svg>

      </div>
    </div>
  `
}

function statusRow(icon, label, value) {
  return `
    <div class="status-row">

      <div class="status-name">
        <span>${icon}</span>
        <span>${label}</span>
      </div>

      <div class="bar">
        <div
          class="bar-fill"
          style="width: ${value}%"
        ></div>
      </div>

      <span class="status-number">
        ${Math.round(value)}
      </span>

    </div>
  `
}

function render() {
  updateEvolution()

  document.querySelector('#app').innerHTML = `
    <main class="game">

      <header class="top-bar">

        <div>
          <span class="tiny">
            ${getStageName()}
          </span>

          <h1>꺢</h1>
        </div>

        <div class="day">
          DAY ${getDay()}
        </div>

      </header>

      <section class="pet-room">

        <div class="window"></div>

        <div class="pet-shadow"></div>

        ${getCharacterHTML()}

        <div class="speech">
          ${getMood()}
        </div>

      </section>

      <section class="status-card">

        ${statusRow(
          '🍙',
          '배고픔',
          pet.hunger
        )}

        ${statusRow(
          '💗',
          '행복',
          pet.happiness
        )}

        ${statusRow(
          '🫧',
          '청결',
          pet.cleanliness
        )}

        ${statusRow(
          '⚡',
          '체력',
          pet.energy
        )}

      </section>

      <nav class="actions">

  <button data-action="feed">
    <span>🍚</span>
    <small>밥</small>
  </button>

  <button data-action="play">
    <span>🎾</span>
    <small>놀기</small>
  </button>

  <button data-action="wash">
    <span>🛁</span>
    <small>씻기</small>
  </button>

  <button data-action="sleep">
    <span>🌙</span>
    <small>잠</small>
  </button>

</nav>

<div class="reset-wrap">
  <button class="reset-button" id="reset-button">
    처음부터 ↻
  </button>
</div>

</main>
    </main>
  `

  document
    .querySelectorAll('[data-action]')
    .forEach((button) => {

      button.addEventListener(
        'click',
        () => {
          doAction(
            button.dataset.action
          )
        }
      )

    })
    const resetButton = document.querySelector('#reset-button')

if (resetButton) {
  resetButton.addEventListener('click', () => {
    const ok = confirm('꺢을 처음부터 다시 키울까요?')

    if (!ok) return

    localStorage.removeItem('my-tamagotchi')
    location.reload()
  })
}
}

function doAction(action) {
  if (pet.stage === 'egg') {
    return
  }

  if (action === 'feed') {
    pet.hunger =
      clamp(pet.hunger + 20)

    pet.cleanliness =
      clamp(pet.cleanliness - 4)

    pet.feedCount++
  }

  if (action === 'play') {
    pet.happiness =
      clamp(pet.happiness + 20)

    pet.energy =
      clamp(pet.energy - 8)

    pet.hunger =
      clamp(pet.hunger - 4)

    pet.playCount++
  }

  if (action === 'wash') {
    pet.cleanliness =
      clamp(pet.cleanliness + 30)

    pet.happiness =
      clamp(pet.happiness - 2)

    pet.washCount++
  }

  if (action === 'sleep') {
    pet.energy =
      clamp(pet.energy + 35)

    pet.hunger =
      clamp(pet.hunger - 5)

    pet.sleepCount++
  }

  savePet()
  render()
}

setInterval(() => {
  if (pet.stage !== 'egg') {

    pet.hunger =
      clamp(pet.hunger - 0.4)

    pet.happiness =
      clamp(pet.happiness - 0.15)

    pet.cleanliness =
      clamp(pet.cleanliness - 0.2)

    pet.energy =
      clamp(pet.energy - 0.2)

    const average =
      (
        pet.hunger +
        pet.happiness +
        pet.cleanliness +
        pet.energy
      ) / 4

    if (average < 35) {
      pet.neglectMinutes++
    }
  }

  updateEvolution()
  savePet()
  render()

}, 60000)
savePet()
savePet()
render()

