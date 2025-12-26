'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './page.module.css'

type CellValue = 'X' | 'O' | null
type Board = CellValue[]
type Difficulty = 'easy' | 'medium' | 'hard'
type GameStats = {
  wins: number
  losses: number
  draws: number
}

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null))
  const [isXNext, setIsXNext] = useState(true)
  const [winner, setWinner] = useState<CellValue | 'draw' | null>(null)
  const [winningLine, setWinningLine] = useState<number[] | null>(null)
  const [promoCode, setPromoCode] = useState<string | null>(null)
  const [isComputerThinking, setIsComputerThinking] = useState(false)
  const [telegramId, setTelegramId] = useState<string | null>(null)
  const [showTelegramModal, setShowTelegramModal] = useState(true)
  const [telegramInput, setTelegramInput] = useState('')
  const [stats, setStats] = useState<GameStats>({ wins: 0, losses: 0, draws: 0 })
  const [promoHistory, setPromoHistory] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(30)
  const [timeLeft, setTimeLeft] = useState(30)
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showPromoHistory, setShowPromoHistory] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Инициализация AudioContext
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }, [])

  // Звуковые эффекты
  const playSound = useCallback((frequency: number, duration: number, type: 'sine' | 'square' = 'sine') => {
    if (!audioContextRef.current) return
    
    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)
    
    oscillator.frequency.value = frequency
    oscillator.type = type
    
    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration)
    
    oscillator.start(audioContextRef.current.currentTime)
    oscillator.stop(audioContextRef.current.currentTime + duration)
  }, [])

  const playClickSound = () => playSound(800, 0.1)
  const playWinSound = () => {
    playSound(523, 0.2) // C
    setTimeout(() => playSound(659, 0.2), 100) // E
    setTimeout(() => playSound(784, 0.3), 200) // G
  }
  const playLoseSound = () => playSound(200, 0.5, 'square')
  const playDrawSound = () => playSound(400, 0.3)

  // Загрузка данных из localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTelegramId = localStorage.getItem('telegramId')
      if (savedTelegramId) {
        setTelegramId(savedTelegramId)
        setShowTelegramModal(false)
      }

      const savedStats = localStorage.getItem('gameStats')
      if (savedStats) {
        setStats(JSON.parse(savedStats))
      }

      const savedPromoHistory = localStorage.getItem('promoHistory')
      if (savedPromoHistory) {
        setPromoHistory(JSON.parse(savedPromoHistory))
      }

      const savedDifficulty = localStorage.getItem('difficulty') as Difficulty
      if (savedDifficulty) {
        setDifficulty(savedDifficulty)
      }

      const savedTimerEnabled = localStorage.getItem('timerEnabled')
      if (savedTimerEnabled === 'true') {
        setTimerEnabled(true)
        const savedTimerSeconds = localStorage.getItem('timerSeconds')
        if (savedTimerSeconds) {
          const seconds = parseInt(savedTimerSeconds, 10)
          setTimerSeconds(seconds)
          setTimeLeft(seconds)
        }
      }
    }
  }, [])

  // Таймер
  useEffect(() => {
    if (timerEnabled && !winner && isXNext && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [timerEnabled, winner, isXNext, timeLeft])

  // Обработка истечения времени
  useEffect(() => {
    if (timerEnabled && timeLeft === 0 && isXNext && !winner && !isComputerThinking) {
      handleTimeOut()
    }
  }, [timeLeft, timerEnabled, isXNext, winner, isComputerThinking])

  // Сброс таймера при новом ходе
  useEffect(() => {
    if (isXNext && timerEnabled && !winner) {
      setTimeLeft(timerSeconds)
    }
  }, [isXNext, timerEnabled, timerSeconds, winner])

  const handleTimeOut = () => {
    if (isXNext && !winner && !isComputerThinking) {
      setIsXNext(false)
      setTimeout(() => {
        const computerMove = getBestMove(board, difficulty)
        const updatedBoard = [...board]
        updatedBoard[computerMove] = 'O'
        setBoard(updatedBoard)
        setIsXNext(true)
        setTimeLeft(timerSeconds)

        const gameResult = calculateWinner(updatedBoard)
        if (gameResult.winner) {
          handleGameEnd(gameResult.winner, gameResult.line)
        }
      }, 500)
    }
  }

  // Генерация промокода
  const generatePromoCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // Сохранение Telegram ID
  const handleTelegramSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = telegramInput.trim()
    if (trimmed) {
      const id = trimmed
      if (typeof window !== 'undefined') {
        localStorage.setItem('telegramId', id)
      }
      setTelegramId(id)
      setTelegramInput('')
      setShowTelegramModal(false)
    }
  }

  const handleSkipTelegram = () => {
    setShowTelegramModal(false)
  }

  // Отправка сообщения в Telegram
  const sendTelegramMessage = async (message: string) => {
    if (!telegramId) {
      console.log('Telegram ID не указан, пропускаем отправку')
      return false
    }
    
    try {
      console.log('Отправка сообщения в Telegram:', { message, chatId: telegramId })
      const response = await fetch('/api/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, chatId: telegramId }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Ошибка отправки в Telegram:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          details: data.details
        })
        
        // Показываем пользователю понятное сообщение
        if (data.error) {
          // Показываем alert с ошибкой (только если это не тихая ошибка)
          if (data.error.includes('Чат не найден') || data.error.includes('не найден')) {
            alert(`⚠️ ${data.error}\n\n${data.details || ''}`)
          }
        }
        
        if (data.details) {
          try {
            const errorDetails = JSON.parse(data.details)
            if (errorDetails.description) {
              console.error('Детали ошибки Telegram API:', errorDetails.description)
            }
          } catch (e) {
            console.error('Текст ошибки:', data.details)
          }
        }
        
        return false
      }
      
      console.log('Сообщение успешно отправлено:', data)
      return true
    } catch (error) {
      console.error('Ошибка отправки в Telegram:', error)
      return false
    }
  }

  // Проверка победителя с возвратом линии
  const calculateWinner = (squares: Board): { winner: CellValue | 'draw' | null; line: number[] | null } => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ]

    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: [a, b, c] }
      }
    }

    if (squares.every((cell) => cell !== null)) {
      return { winner: 'draw', line: null }
    }

    return { winner: null, line: null }
  }

  // AI ход с уровнями сложности
  const getBestMove = (squares: Board, diff: Difficulty): number => {
    const availableMoves = squares
      .map((val, idx) => (val === null ? idx : null))
      .filter((val) => val !== null) as number[]

    if (availableMoves.length === 0) return 0

    // Легкий уровень - случайные ходы
    if (diff === 'easy') {
      return availableMoves[Math.floor(Math.random() * availableMoves.length)]
    }

    // Средний уровень - базовая стратегия
    if (diff === 'medium') {
      // Центр
      if (squares[4] === null) return 4

      // Блокируем игрока
      for (const move of availableMoves) {
        const testBoard = [...squares]
        testBoard[move] = 'X'
        if (calculateWinner(testBoard).winner === 'X') {
          return move
        }
      }

      // Пытаемся выиграть
      for (const move of availableMoves) {
        const testBoard = [...squares]
        testBoard[move] = 'O'
        if (calculateWinner(testBoard).winner === 'O') {
          return move
        }
      }

      // Случайный ход
      return availableMoves[Math.floor(Math.random() * availableMoves.length)]
    }

    // Сложный уровень - минимикс
    if (diff === 'hard') {
      // Центр
      if (squares[4] === null) return 4

      // Блокируем игрока
      for (const move of availableMoves) {
        const testBoard = [...squares]
        testBoard[move] = 'X'
        if (calculateWinner(testBoard).winner === 'X') {
          return move
        }
      }

      // Пытаемся выиграть
      for (const move of availableMoves) {
        const testBoard = [...squares]
        testBoard[move] = 'O'
        if (calculateWinner(testBoard).winner === 'O') {
          return move
        }
      }

      // Углы
      const corners = [0, 2, 6, 8]
      const availableCorners = corners.filter((idx) => squares[idx] === null)
      if (availableCorners.length > 0) {
        return availableCorners[
          Math.floor(Math.random() * availableCorners.length)
        ]
      }

      // Остальные
      return availableMoves[Math.floor(Math.random() * availableMoves.length)]
    }

    return availableMoves[0]
  }

  // Обработка окончания игры
  const handleGameEnd = async (gameWinner: CellValue | 'draw', line: number[] | null) => {
    setWinner(gameWinner)
    setWinningLine(line)

    setStats((prevStats) => {
      const newStats = { ...prevStats }
      if (gameWinner === 'X') {
        newStats.wins++
        const code = generatePromoCode()
        setPromoCode(code)
        setPromoHistory((prevHistory) => {
          const newHistory = [...prevHistory, code]
          if (typeof window !== 'undefined') {
            localStorage.setItem('promoHistory', JSON.stringify(newHistory))
          }
          return newHistory
        })
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
        playWinSound()
        sendTelegramMessage(`Победа! Промокод выдан: ${code}`)
      } else if (gameWinner === 'O') {
        newStats.losses++
        playLoseSound()
        sendTelegramMessage('Проигрыш')
      } else {
        newStats.draws++
        playDrawSound()
        sendTelegramMessage('Ничья!')
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('gameStats', JSON.stringify(newStats))
      }
      return newStats
    })
  }

  // Обработка клика по ячейке
  const handleClick = async (index: number) => {
    if (board[index] || winner || !isXNext || isComputerThinking) return

    playClickSound()

    const newBoard = [...board]
    newBoard[index] = 'X'
    setBoard(newBoard)
    setIsXNext(false)
    setTimeLeft(timerSeconds)

    const gameResult = calculateWinner(newBoard)
    if (gameResult.winner) {
      await handleGameEnd(gameResult.winner, gameResult.line)
      return
    }

    // Ход компьютера
    setIsComputerThinking(true)
    setTimeout(() => {
      const computerMove = getBestMove(newBoard, difficulty)
      const updatedBoard = [...newBoard]
      updatedBoard[computerMove] = 'O'
      setBoard(updatedBoard)
      setIsXNext(true)
      setIsComputerThinking(false)
      setTimeLeft(timerSeconds)

      const gameResult = calculateWinner(updatedBoard)
      if (gameResult.winner) {
        handleGameEnd(gameResult.winner, gameResult.line)
      }
    }, difficulty === 'easy' ? 300 : difficulty === 'medium' ? 500 : 700)
  }

  // Сброс игры
  const resetGame = () => {
    setBoard(Array(9).fill(null))
    setIsXNext(true)
    setWinner(null)
    setWinningLine(null)
    setPromoCode(null)
    setIsComputerThinking(false)
    setTimeLeft(timerSeconds)
    setShowConfetti(false)
  }

  // Изменить Telegram ID
  const handleChangeTelegram = () => {
    setShowTelegramModal(true)
    setTelegramInput(telegramId || '')
  }

  // Изменить сложность
  const handleDifficultyChange = (diff: Difficulty) => {
    setDifficulty(diff)
    if (typeof window !== 'undefined') {
      localStorage.setItem('difficulty', diff)
    }
    resetGame()
  }

  // Изменить настройки таймера
  const handleTimerToggle = (enabled: boolean) => {
    setTimerEnabled(enabled)
    if (typeof window !== 'undefined') {
      localStorage.setItem('timerEnabled', enabled.toString())
    }
    if (!enabled && timerRef.current) {
      clearInterval(timerRef.current)
    }
  }

  const handleTimerSecondsChange = (seconds: number) => {
    setTimerSeconds(seconds)
    setTimeLeft(seconds)
    if (typeof window !== 'undefined') {
      localStorage.setItem('timerSeconds', seconds.toString())
    }
  }

  const renderCell = (index: number) => {
    const value = board[index]
    const isWinning = winningLine?.includes(index)
    
    return (
      <button
        className={`${styles.cell} ${isWinning ? styles.winningCell : ''}`}
        onClick={() => handleClick(index)}
        disabled={!!value || !!winner || !isXNext || isComputerThinking}
      >
        {value === 'X' && <span className={styles.x}>✕</span>}
        {value === 'O' && <span className={styles.o}>○</span>}
      </button>
    )
  }

  return (
    <div className={styles.container}>
      {/* Конфетти эффект */}
      {showConfetti && (
        <div className={styles.confettiContainer}>
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className={styles.confetti}
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c'][
                  Math.floor(Math.random() * 5)
                ],
              }}
            />
          ))}
        </div>
      )}

      {/* Модальное окно для ввода Telegram */}
      {showTelegramModal && (
        <div className={styles.telegramModal}>
          <div className={styles.telegramContent}>
            <h2 className={styles.telegramTitle}>📱 Telegram уведомления</h2>
            <p className={styles.telegramText}>
              Укажите ваш Telegram username (например: @username) или chat_id (число), 
              чтобы получать уведомления о результатах игры
            </p>
            <p className={styles.telegramImportant}>
              ⚠️ <strong>Важно:</strong> Чтобы получать уведомления, сначала напишите боту любое сообщение. 
              Бот не может отправлять сообщения пользователям, которые с ним еще не общались.
            </p>
            <a
              href="https://t.me/krestiki_i_noliki01_bot"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.telegramBotLink}
            >
              📱 Написать боту @krestiki_i_noliki01_bot
            </a>
            <form onSubmit={handleTelegramSubmit}>
              <input
                type="text"
                className={styles.telegramInput}
                placeholder="@username или chat_id"
                value={telegramInput}
                onChange={(e) => setTelegramInput(e.target.value)}
                autoFocus
              />
              <div className={styles.telegramButtons}>
                <button
                  type="submit"
                  className={styles.telegramSubmitBtn}
                  disabled={!telegramInput.trim()}
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  className={styles.telegramSkipBtn}
                  onClick={handleSkipTelegram}
                >
                  Пропустить
                </button>
              </div>
            </form>
            <p className={styles.telegramHint}>
              💡 Чтобы узнать chat_id, напишите боту @userinfobot в Telegram<br/>
              📝 После указания username обязательно напишите боту любое сообщение для активации!
            </p>
          </div>
        </div>
      )}

      <div className={styles.gameCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>Крестики-нолики</h1>
          <div className={styles.headerButtons}>
            <button
              className={styles.iconBtn}
              onClick={() => setShowStats(!showStats)}
              title="Статистика"
            >
              📊
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => setShowSettings(!showSettings)}
              title="Настройки"
            >
              ⚙️
            </button>
            {promoHistory.length > 0 && (
              <button
                className={styles.iconBtn}
                onClick={() => setShowPromoHistory(!showPromoHistory)}
                title="История промокодов"
              >
                🎁
              </button>
            )}
            <button
              className={`${styles.iconBtn} ${styles.resetBtn}`}
              onClick={resetGame}
              title="Новая игра"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Статистика */}
        {showStats && (
          <div className={styles.statsPanel}>
            <h3>📊 Статистика</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{stats.wins}</span>
                <span className={styles.statLabel}>Побед</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{stats.losses}</span>
                <span className={styles.statLabel}>Проигрышей</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{stats.draws}</span>
                <span className={styles.statLabel}>Ничьих</span>
              </div>
            </div>
          </div>
        )}

        {/* Настройки */}
        {showSettings && (
          <div className={styles.settingsPanel}>
            <h3>⚙️ Настройки</h3>
            <div className={styles.settingItem}>
              <label>Уровень сложности:</label>
              <div className={styles.difficultyButtons}>
                <button
                  className={`${styles.difficultyBtn} ${difficulty === 'easy' ? styles.active : ''}`}
                  onClick={() => handleDifficultyChange('easy')}
                >
                  Легкий
                </button>
                <button
                  className={`${styles.difficultyBtn} ${difficulty === 'medium' ? styles.active : ''}`}
                  onClick={() => handleDifficultyChange('medium')}
                >
                  Средний
                </button>
                <button
                  className={`${styles.difficultyBtn} ${difficulty === 'hard' ? styles.active : ''}`}
                  onClick={() => handleDifficultyChange('hard')}
                >
                  Сложный
                </button>
              </div>
            </div>
            <div className={styles.settingItem}>
              <label>
                <input
                  type="checkbox"
                  checked={timerEnabled}
                  onChange={(e) => handleTimerToggle(e.target.checked)}
                />
                Включить таймер
              </label>
              {timerEnabled && (
                <div className={styles.timerSettings}>
                  <label>Время на ход (секунды):</label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={timerSeconds}
                    onChange={(e) => handleTimerSecondsChange(parseInt(e.target.value, 10))}
                    className={styles.timerInput}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* История промокодов */}
        {showPromoHistory && (
          <div className={styles.promoHistoryPanel}>
            <h3>🎁 История промокодов</h3>
            <div className={styles.promoList}>
              {promoHistory.length === 0 ? (
                <p>Промокодов пока нет</p>
              ) : (
                promoHistory.slice().reverse().map((code, index) => (
                  <div key={index} className={styles.promoItem}>
                    {code}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {telegramId && (
          <div className={styles.telegramStatus}>
            <span>📱 Telegram: {telegramId}</span>
            <button
              className={styles.changeTelegramBtn}
              onClick={handleChangeTelegram}
              title="Изменить Telegram"
            >
              ✏️
            </button>
          </div>
        )}

        {isComputerThinking && (
          <div className={styles.thinking}>
            <span className={styles.thinkingIcon}>⚙️</span>
            <span>Компьютер думает...</span>
          </div>
        )}

        {timerEnabled && !winner && isXNext && (
          <div className={styles.timer}>
            <span>⏱️</span>
            <span>{timeLeft} сек</span>
          </div>
        )}

        <div className={styles.board}>
          {Array(9)
            .fill(null)
            .map((_, index) => (
              <div key={index}>{renderCell(index)}</div>
            ))}
        </div>

        {winner === 'X' && promoCode && (
          <div className={styles.winnerModal}>
            <div className={styles.winnerContent}>
              <h2 className={styles.winnerTitle}>🎉 Поздравляем!</h2>
              <p className={styles.winnerText}>Вы выиграли!</p>
              <div className={styles.promoCode}>
                <p className={styles.promoLabel}>Ваш промокод:</p>
                <p className={styles.promoValue}>{promoCode}</p>
              </div>
              <button className={styles.playAgainBtn} onClick={resetGame}>
                Играть снова
              </button>
            </div>
          </div>
        )}

        {winner === 'O' && (
          <div className={styles.loserModal}>
            <div className={styles.loserContent}>
              <h2 className={styles.loserTitle}>😔 Увы...</h2>
              <p className={styles.loserText}>Компьютер выиграл</p>
              <button className={styles.playAgainBtn} onClick={resetGame}>
                Попробовать ещё раз
              </button>
            </div>
          </div>
        )}

        {winner === 'draw' && (
          <div className={styles.drawModal}>
            <div className={styles.drawContent}>
              <h2 className={styles.drawTitle}>🤝 Ничья!</h2>
              <button className={styles.playAgainBtn} onClick={resetGame}>
                Играть снова
              </button>
            </div>
          </div>
        )}

        {!winner && (
          <div className={styles.status}>
            {isXNext ? (
              <>
                <span className={styles.statusIcon}>👆</span>
                <span>Ваш ход</span>
              </>
            ) : (
              <>
                <span className={styles.statusIcon}>🤖</span>
                <span>Ход компьютера</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
