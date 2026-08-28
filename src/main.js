import './style.css'
import hatchSoundUrl from './assets/hatch.mp3'
import bgmUrl from './assets/bgm.mp3'

let crackSoundStarted = false
let isHatching = false
let audioContext = null
const hatchAudio = new Audio(hatchSoundUrl)
hatchAudio.preload = 'auto'
hatchAudio.volume = 0.8

function playPopSound() {
  hatchAudio.currentTime = 0

  hatchAudio.play().catch((error) => {
    console.log('부화 소리 재생 실패:', error)
  })
}

const bgmAudio = new Audio(bgmUrl)
bgmAudio.loop = true
bgmAudio.volume = 0.18
bgmAudio.preload = 'none'

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )()
  }

  return audioContext
}

document.addEventListener(
  'pointerdown',
  () => {
    getAudioContext()
    bgmAudio.play().catch(() => {})
  },
  { once: true }
)

const defaultState = {
  hunger: 10,
  happiness: 10,
  cleanliness: 10,
  energy: 10,

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

function getGrowthInfo() {
  const age = getAgeMinutes()

  if (pet.stage === 'egg') {
    return {
      current: age,
      start: 0,
      target: 2,
      label: '부화까지'
    }
  }

  if (pet.stage === 'baby') {
    return {
      current: age,
      start: 2,
      target: 15,
      label: '어린이까지'
    }
  }

  if (pet.stage === 'child') {
    return {
      current: age,
      start: 15,
      target: 40,
      label: '최종 진화까지'
    }
  }

  return null
}

function updateEvolution() {
  const age = getAgeMinutes()

  // 성장속도
  // 2분 : 알 → 아기
  if (
    pet.stage === 'egg' &&
    age >= 2 &&
    !isHatching
  ) {
    isHatching = true
    setTimeout(() => render(), 0)
  
    setTimeout(() => {
      pet.stage = 'baby'
  
      pet.hunger = 30
      pet.happiness = 30
      pet.cleanliness = 30
      pet.energy = 30
  
      savePet()
      render()
    }, 1800)
  
    playPopSound()
  }


  // 15분 : 아기 → 어린이
  if (pet.stage === 'baby' && age >= 15) {
    pet.stage = 'child'
    savePet()
  }

  // 40분 : 어린이 → 최종 진화
  if (pet.stage === 'child' && age >= 40) {
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
     체력 바닥 + 배고픔 바닥 + 장시간 방치
  ================================== */

  if (
    pet.hunger <= 20 &&
    pet.energy <= 20 &&
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
     3. 먹보
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
     4. 장난꾸러기
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
     5. 미치광이
     한 행동에 심하게 과몰입
  ================================== */

  if (
    totalActions >= 8 &&
    actionGap >= 6
  ) {
    return 'crazy'
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
    child: '어린이',
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
  const moodLines = {
    egg: [
      '(안에서 뭐가 움직인다...)',
      '(꿈틀...)',
      '(조금만 기다려!)'
    ],

    baby: [
      '꺢...',
      '!#$%#@#@#',
      '꼬르륵',
      '꺢!',
      '쿨쿨...'
    ],

    child: [
      '뭐 하고 놀까?',
      '꺢 많이 컸지?',
      '심심해!',
      '같이 놀자!',
      '꺢 잘 크고 있지?'
    ],

    playful: [
      '놀자!!!',
      '심심해 심심해!',
      '뭐 재미있는 이야기 좀 해봐라',
      '야르',
      '야르야르의신야르야르렁'
    ],

    chubby: [
      '밥은?',
      '뭐 먹을 거 없냐?',
      '배고픈 것 같은데...',
      '왜이렇게 입이심심하지?',
      '밥 쳐먹어야지',
    ],

    gentle: [
      '저는 예절바른 꺢입니다.',
      '잘 꺢하고 계신가요?',
      '저는 꺢합니다.',
      '천천히 꺢하세요.',
      '함께 꺢해서 좋네요.'
    ],

    crazy: [
      '꺢꺢꺢꺢꺢꺢꺢!!!',
      '지금 존나 꺢이야!!!',
      '뭐야뭐야뭐야!!!',
      '으히히히히히!',
      '가만히 있을 수 없어!!!'
    ],

    basic: [
      '변비인가?',
      '또 피드백 늦게주네',
      '아...',
      '뭐 씨발아',
      '양치꺢 보고싶어?'
    ],

    dark: [
      '...',
      '씹충요는 정상이 없어',
      '지랄!',
      '아 씹충요들 또 지랄이네',
      '메타몽오시 뒤지라고?'
    ],

    melted: [
      '못일어나는중...',
      '흐물흐물...',
      '움직이기 귀찮아...',
      '바닥이 편하다...',
      '나 좀 일으켜줘...'
    ]
  }

  const lines = moodLines[pet.stage] || ['꺢...']

  return lines[Math.floor(Math.random() * lines.length)]
}

function getCharacterHTML() {
  if (pet.stage === 'egg') {
    const age = getAgeMinutes()
    const crackClass = age >= 1 ? 'cracking' : ''
    const popClass = isHatching ? 'popping' : ''

    return `
    <div class="egg-character ${crackClass} ${popClass}">
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

  const age = getAgeMinutes()

  if (
    pet.stage === 'egg' &&
    age >= 1 &&
    !crackSoundStarted
  ) {
    crackSoundStarted = true
  
    setTimeout(() => playCrackSound(), 300)
    setTimeout(() => playCrackSound(), 900)
    setTimeout(() => playCrackSound(), 1500)
  }

  document.querySelector('#app').innerHTML = `
    <main class="game">

      <header class="top-bar">

        <div>
          <span class="tiny">
            ${getStageName()}
          </span>

          <h1>꺢</h1>
        </div>
        ${(() => {
          const growth = getGrowthInfo()
        
          if (!growth) {
            return `
              <div class="growth-complete">
                성장 완료 ✦
              </div>
            `
          }
        
          const progress = Math.min(
            100,
            Math.max(
              0,
              ((growth.current - growth.start) /
                (growth.target - growth.start)) * 100
            )
          )
        
          const remaining = Math.max(
            0,
            growth.target - growth.current
          )
        
          return `
            <div class="growth-info">
              <div class="growth-text">
                ${growth.label} ${remaining}분
              </div>
        
              <div class="growth-bar">
                <div
                  class="growth-fill"
                  style="width: ${progress}%"
                ></div>
              </div>
            </div>
          `
        })()}
      </header>

      <section class="pet-room">

        <div class="window"></div>

        <div class="pet-shadow"></div>

        ${getCharacterHTML()}

        <div class="speech" id="speech">
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

  <button data-action="feed" ${pet.stage === 'egg' ? 'disabled' : ''}>
    <span>🍚</span>
    <small>밥</small>
  </button>

  <button data-action="play" ${pet.stage === 'egg' ? 'disabled' : ''}>
    <span>🎾</span>
    <small>놀기</small>
  </button>

  <button data-action="wash" ${pet.stage === 'egg' ? 'disabled' : ''}>
    <span>🛁</span>
    <small>씻기</small>
  </button>

  <button data-action="sleep" ${pet.stage === 'egg' ? 'disabled' : ''}>
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

    function playBoingSound() {
      const audioContext = getAudioContext()
    
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
    
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
    
      oscillator.type = 'sine'
    
      oscillator.frequency.setValueAtTime(280, audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(
        520,
        audioContext.currentTime + 0.08
      )
      oscillator.frequency.exponentialRampToValueAtTime(
        360,
        audioContext.currentTime + 0.18
      )
    
      gain.gain.setValueAtTime(0.12, audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.22
      )
    
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.22)
    }

    function playCrackSound() {
      const audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )()
    
      const now = audioContext.currentTime
    
      // 짧은 "쩍"
      for (let i = 0; i < 3; i++) {
        const oscillator = audioContext.createOscillator()
        const gain = audioContext.createGain()
    
        oscillator.type = 'square'
        oscillator.frequency.setValueAtTime(
          180 + Math.random() * 140,
          now + i * 0.045
        )
    
        oscillator.frequency.exponentialRampToValueAtTime(
          70,
          now + i * 0.045 + 0.07
        )
    
        gain.gain.setValueAtTime(0, now + i * 0.045)
        gain.gain.linearRampToValueAtTime(
          0.045,
          now + i * 0.045 + 0.005
        )
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          now + i * 0.045 + 0.08
        )
    
        oscillator.connect(gain)
        gain.connect(audioContext.destination)
    
        oscillator.start(now + i * 0.045)
        oscillator.stop(now + i * 0.045 + 0.08)
      }
    }

    function playPopSound() {
      hatchAudio.currentTime = 0
    
      hatchAudio.play().catch((error) => {
        console.log('부화 소리 재생 실패:', error)
      })
    }

    const character = document.querySelector(
      '.kkaek-character, .egg-character'
    )

    if (character) {
      character.addEventListener('click', () => {
        character.classList.remove('boing')
        
    
        void character.offsetWidth
    
        character.classList.add('boing')
        playBoingSound()
        
        if (pet.stage === 'egg') {
          hatchAudio.play()
            .then(() => {
              hatchAudio.pause()
              hatchAudio.currentTime = 0
            })
            .catch(() => {})
        }

        if (pet.stage === 'egg') {
          const ctx = getAudioContext()
        
          if (ctx.state === 'suspended') {
            ctx.resume()
          }
        
          const unlock = ctx.createOscillator()
          const unlockGain = ctx.createGain()
        
          unlock.connect(unlockGain)
          unlockGain.connect(ctx.destination)
        
          unlockGain.gain.setValueAtTime(0.0001, ctx.currentTime)
        
          unlock.start()
          unlock.stop(ctx.currentTime + 0.05)
        }

        setTimeout(() => {
          character.classList.remove('boing')
        }, 450)
    
        const speech = document.querySelector('#speech')
    
        const touchLinesByStage = {
          egg: [
            '(꿈틀꿈틀)',
            '...',
          ],

          baby: [
            '꺢!',
            '끾!',
            '헤헤',
            '꺠앢!',
            '또!',
            '꺼억'
          ],
        
          child: [
            '왜 눌러!',
            '꺢꺢!',
            '더 좋은 꺢을 배웠어',
            '나랑 꺢하자!',
            '또 꺢해봐!',
            '뿡',
            '애~'
          ],
        
          playful: [
            '왜 눌러!',
            '간지러!',
            '야!!!!!!!!!!!!!',
            '야!!!!!!!야!!!!!!!야!!!!!!!',
            '킥킥킥킥',
            '애~',
            '갹굑굑',
            '끾',
            '그만해~!',
            '뒤진다~!',
            '애를 애를 애~',
            '닭갈비를 꺼내도록하죠~',
            '내가 꺢이라면???',
            '헥헥헥',
            '어어???',
            '야! 잡아봐!',
            '큭큭 못 잡지!',
            '또 눌렀다! 이제 꺢해봐!',
            '간지럽잖아!!',
            '놀자 놀자!!'
          ],
        
          chubby: [
            '왜 눌러!',
            '간지러!',
            '야!!!!!!!!!!!!!',
            '야!!!!!!!야!!!!!!!야!!!!!!!',
            '킥킥',
            '애~',
            '갹굑굑',
            '끾',
            '그만해!',
            '뒤진다!',
            '애를 애를 애.',
            '닭갈비는 먹어도 먹어도 질리지가 않음',
            '물에 빠진 고기는 별로야',
            '꺼어어억~',
            '버억',
            '밥 줘.',
            '먹을 거 없어?',
            '누르지 말고 밥차려',
            '배고파...',
            '간식!',
            '먹어도 먹어도 배가 고파'
          ],
        
          gentle: [
            '왜 눌러!',
            '간지러!',
            '야...!',
            '야...! 야...! 야...!!!',
            '정중하게 인사할게요.',
            '애~',
            '갹굑굑',
            '끾',
            '굽신굽신',
            '그만해주세요.',
            '애를 애를 애.',
            '닭갈비를 꺼냈습니다.',
            '기분이 이상해요.',
            '안녕하세요 PD님 :)',
            '어어?',
            '라고할줄알았냐?',
            '간지러.',
            '살살 눌러주세요.',
            '후훗',
            '저는 젠틀꺢입니다.'
          ],
        
          crazy: [
            '삐걱삐걱!',
            '간지러!',
            '야!!!!!!!!!!!!!',
            '야!!!!!!!야!!!!!!!야!!!!!!!',
            '킥킥',
            '애~',
            '갹굑굑',
            '끾',
            '그만!!!',
            '뒤진다!~~!!!',
            '애를 애를 애!!!',
            '닭닭닭닭 닭갈비',
            '기분이 이상해??',
            '꺠애애애애앢',
            '어어???',
            '꺢꺢꺢꺢!',
            '또 눌러!!',
            '꺢꺢꺢꺢?',
            '삐꾸!',
            '애애애애애애~~~'
          ],
        
          basic: [
            '왜 눌러!',
            '간지러!',
            '야!!!!!!!!!!!!!',
            '야!!!!!!!야!!!!!!!야!!!!!!!',
            '킥킥',
            '애~',
            '갹굑굑',
            '끾',
            '그만해!',
            '뒤진다!',
            '애를 애를 애.',
            '니가 눌러서 닭갈비 꺼냄.',
            '기분이 이상해',
            '꺠애애애애앢',
            '어어???',
            '뭐.',
            '꺢은 꺢이지.',
            '뭐 어쩌라고!',
            '어? 눌러?',
            '원래 기본꺢이 원조야.',
            '너 씨발 기본꺢이 불만이야?'
          ],
        
          dark: [
            '왜 눌러 씨발',
            '좆같아',
            '야!!!!!!!!!!!!!',
            '야!!!!!!!야!!!!!!!야!!!!!!!',
            '씹충요는 사회악이야',
            '애',
            '갹굑굑',
            '끾',
            '그만.',
            '뒤진다',
            '애를 애를 애.',
            '에휴 씨발',
            '일어나자마자 씹충요 밟았네',
            '두광좀 줘.',
            '어어?',
            '...',
            '건드리지 마',
            '왜 왔어',
            '......',
            '너죽임'
          ],
        
          melted: [
            '왜 눌... 러...',
            '철퍽거려...',
            '야........',
            '야... 야... 소리지를 힘도 없다',
            '큭큭큭...',
            '애~',
            '갹굑굑',
            '끾',
            '그만해...',
            '더워',
            '애를 애를 애...',
            '숯불1후라이드1을 먹으면 몸이돌아오려나',
            '니가 날 녹였어',
            '꺠애애애애애애애애앢',
            '더 녹는다...',
            '흐물...',
            '꺢 녹는다...',
            '꺢꺢...',
            '으으...',
            '나 좀 꺢해봐......'
          ]
        }
    
        if (speech) {
          const touchLines =
  touchLinesByStage[pet.stage] || ['꺢!']

const randomLine =
  touchLines[Math.floor(Math.random() * touchLines.length)]
    
          speech.textContent = randomLine
    
          setTimeout(() => {
            speech.textContent = getMood()
          }, 3000)
        }
      })
    }

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
      clamp(pet.hunger + 7)
    pet.feedCount++
  }

  if (action === 'play') {
    pet.happiness =
      clamp(pet.happiness + 8)
    pet.playCount++
  }

  if (action === 'wash') {
    pet.cleanliness =
      clamp(pet.cleanliness + 7)
    pet.washCount++
  }

  if (action === 'sleep') {
    pet.energy =
      clamp(pet.energy + 14)
    pet.sleepCount++
  }

  savePet()
  render()
}
render()
setInterval(() => {
  const speech = document.querySelector('#speech')

  if (speech) {
    speech.textContent = getMood()
  }
}, 12000)

setInterval(() => {
  if (pet.stage !== 'egg') {
    pet.hunger =
      clamp(pet.hunger - 0.8)

    pet.happiness =
      clamp(pet.happiness - 0.3)

    pet.cleanliness =
      clamp(pet.cleanliness - 0.4)

    pet.energy =
      clamp(pet.energy - 0.4)

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