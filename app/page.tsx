'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'

type CellValue = 'X' | 'O' | null
type Board = CellValue[]

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null))
  const [isXNext, setIsXNext] = useState(true)
  const [winner, setWinner] = useState<CellValue | 'draw' | null>(null)
  const [promoCode, setPromoCode] = useState<string | null>(null)
  const [isComputerThinking, setIsComputerThinking] = useState(false)

  // Генерация промокода
  const generatePromoCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // Отправка сообщения в Telegram
  const sendTelegramMessage = async (message: string) => {
    try {
      const response = await fetch('/api/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })
      return response.ok
    } catch (error) {
      console.error('Ошибка отправки в Telegram:', error)
      return false
    }
  }

  // Проверка победителя
  const calculateWinner = (squares: Board): CellValue | 'draw' | null => {
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
        return squares[a]
      }
    }

    if (squares.every((cell) => cell !== null)) {
      return 'draw'
    }

    return null
  }

  // AI ход (минимикс алгоритм)
  const getBestMove = (squares: Board): number => {
    // Простая стратегия: сначала центр, потом углы, потом остальное
    const availableMoves = squares
      .map((val, idx) => (val === null ? idx : null))
      .filter((val) => val !== null) as number[]

    // Центр
    if (squares[4] === null) return 4

    // Блокируем игрока, если он может выиграть
    for (const move of availableMoves) {
      const testBoard = [...squares]
      testBoard[move] = 'X'
      if (calculateWinner(testBoard) === 'X') {
        return move
      }
    }

    // Пытаемся выиграть
    for (const move of availableMoves) {
      const testBoard = [...squares]
      testBoard[move] = 'O'
      if (calculateWinner(testBoard) === 'O') {
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

  // Обработка клика по ячейке
  const handleClick = async (index: number) => {
    if (board[index] || winner || !isXNext || isComputerThinking) return

    const newBoard = [...board]
    newBoard[index] = 'X'
    setBoard(newBoard)
    setIsXNext(false)

    const gameWinner = calculateWinner(newBoard)
    if (gameWinner) {
      setWinner(gameWinner)
      if (gameWinner === 'X') {
        const code = generatePromoCode()
        setPromoCode(code)
        await sendTelegramMessage(`Победа! Промокод выдан: ${code}`)
      } else if (gameWinner === 'draw') {
        await sendTelegramMessage('Ничья!')
      }
      return
    }

    // Ход компьютера
    setIsComputerThinking(true)
    setTimeout(() => {
      const computerMove = getBestMove(newBoard)
      const updatedBoard = [...newBoard]
      updatedBoard[computerMove] = 'O'
      setBoard(updatedBoard)
      setIsXNext(true)
      setIsComputerThinking(false)

      const gameWinner = calculateWinner(updatedBoard)
      if (gameWinner) {
        setWinner(gameWinner)
        if (gameWinner === 'O') {
          sendTelegramMessage('Проигрыш')
        } else if (gameWinner === 'draw') {
          sendTelegramMessage('Ничья!')
        }
      }
    }, 500)
  }

  // Сброс игры
  const resetGame = () => {
    setBoard(Array(9).fill(null))
    setIsXNext(true)
    setWinner(null)
    setPromoCode(null)
    setIsComputerThinking(false)
  }

  const renderCell = (index: number) => {
    const value = board[index]
    return (
      <button
        className={styles.cell}
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
      <div className={styles.gameCard}>
        <h1 className={styles.title}>Крестики-нолики</h1>
        <p className={styles.subtitle}>Играйте против компьютера</p>

        {isComputerThinking && (
          <div className={styles.thinking}>Компьютер думает...</div>
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
            {isXNext ? 'Ваш ход' : 'Ход компьютера'}
          </div>
        )}
      </div>
    </div>
  )
}

