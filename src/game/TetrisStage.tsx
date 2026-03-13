import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Application, extend, useTick } from '@pixi/react'
import { Container, Graphics } from 'pixi.js'
import {
  type GameState,
  type Board,
  type Piece,
  COLS,
  ROWS,
  CELL_SIZE,
  PIECE_COLORS,
  getPieceCells,
  initState,
  startGame,
  pauseGame,
  resumeGame,
  moveLeft,
  moveRight,
  rotate,
  softDrop,
  hardDrop,
  tick,
  getDropIntervalMs,
} from './tetris'

extend({ Container, Graphics })

const BOARD_PX = COLS * CELL_SIZE
const BOARD_PY = ROWS * CELL_SIZE
const PAD = 4
const BORDER = 2

function drawCell(g: Graphics, x: number, y: number, color: number, isGhost = false) {
  const size = CELL_SIZE - 1
  g.rect(x, y, size, size)
  if (isGhost) {
    g.fill({ color, alpha: 0.35 })
    g.stroke({ width: 1, color: 0xffffff, alpha: 0.5 })
  } else {
    g.fill({ color })
    g.stroke({ width: 1, color: 0x000000, alpha: 0.25 })
  }
}

function BoardView({ board }: { board: Board }) {
  const draw = useCallback(
    (g: Graphics) => {
      g.clear()
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = board[r][c]
          if (cell) {
            const color = PIECE_COLORS[cell - 1] ?? 0x888888
            drawCell(g, c * CELL_SIZE, r * CELL_SIZE, color, false)
          }
        }
      }
    },
    [board]
  )
  return <pixiGraphics draw={draw} />
}

function PieceView({ piece }: { piece: Piece }) {
  const draw = useCallback(
    (g: Graphics) => {
      g.clear()
      const color = PIECE_COLORS[piece.type] ?? 0xffffff
      for (const { r, c } of getPieceCells(piece)) {
        if (r >= 0) drawCell(g, c * CELL_SIZE, r * CELL_SIZE, color, false)
      }
    },
    [piece]
  )
  return <pixiGraphics draw={draw} />
}

function GhostPieceView({ piece, board }: { piece: Piece; board: Board }) {
  let ghostRow = piece.row
  while (ghostRow < ROWS) {
    const next = { ...piece, row: ghostRow + 1 }
    const cells = getPieceCells(next)
    const hit = cells.some(
      ({ r, c }) => r >= ROWS || c < 0 || c >= COLS || (r >= 0 && board[r][c])
    )
    if (hit) break
    ghostRow++
  }
  const ghost = { ...piece, row: ghostRow }
  const draw = useCallback(
    (g: Graphics) => {
      g.clear()
      const color = PIECE_COLORS[piece.type] ?? 0xffffff
      for (const { r, c } of getPieceCells(ghost)) {
        if (r >= 0) drawCell(g, c * CELL_SIZE, r * CELL_SIZE, color, true)
      }
    },
    [ghost.row, piece.type]
  )
  return <pixiGraphics draw={draw} />
}

function Playfield({ state }: { state: GameState }) {
  return (
    <pixiContainer x={PAD + BORDER} y={PAD + BORDER}>
      <BoardView board={state.board} />
      {state.piece && (
        <>
          <GhostPieceView piece={state.piece} board={state.board} />
          <PieceView piece={state.piece} />
        </>
      )}
    </pixiContainer>
  )
}

function BorderBg() {
  const draw = useCallback((g: Graphics) => {
    g.clear()
    g.roundRect(0, 0, BOARD_PX + BORDER * 2, BOARD_PY + BORDER * 2, 4)
    g.fill({ color: 0x1a1a2e })
    g.stroke({ width: BORDER, color: 0x4a4a6a })
  }, [])
  return <pixiGraphics draw={draw} />
}

function GameLoop({
  setState,
}: {
  setState: Dispatch<SetStateAction<GameState>>
}) {
  const lastDrop = useRef(0)
  useTick((ticker) => {
    const now = ticker.lastTime
    setState((s: GameState) => {
      if (s.status !== 'playing') return s
      const interval = getDropIntervalMs(s.level)
      if (now - lastDrop.current >= interval) {
        lastDrop.current = now
        return tick(s, interval)
      }
      return s
    })
  })
  return null
}

export default function TetrisStage() {
  const [state, setState] = useState<GameState>(initState)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          setState((s) => moveLeft(s))
          break
        case 'ArrowRight':
          e.preventDefault()
          setState((s) => moveRight(s))
          break
        case 'ArrowDown':
          e.preventDefault()
          setState((s) => softDrop(s))
          break
        case 'ArrowUp':
          e.preventDefault()
          setState((s) => rotate(s))
          break
        case ' ':
          e.preventDefault()
          setState((s) => hardDrop(s))
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleStart = useCallback(() => {
    setState((s) => startGame(s))
  }, [])
  const handlePause = useCallback(() => {
    setState((s) => (s.status === 'playing' ? pauseGame(s) : resumeGame(s)))
  }, [])

  const width = BOARD_PX + PAD * 2 + BORDER * 2
  const height = BOARD_PY + PAD * 2 + BORDER * 2

  return (
    <div className="tetris-wrap">
      <div className="tetris-ui">
        <div className="tetris-score">
          <div>Score <strong>{state.score}</strong></div>
          <div>Level <strong>{state.level}</strong></div>
          <div>Lines <strong>{state.lines}</strong></div>
        </div>
        <div className="tetris-actions">
          {state.status === 'idle' || state.status === 'gameover' ? (
            <button type="button" className="btn btn-primary" onClick={handleStart}>
              {state.status === 'gameover' ? 'Play Again' : 'Start'}
            </button>
          ) : (
            <button type="button" className="btn" onClick={handlePause}>
              {state.status === 'paused' ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>
        <div className="tetris-keys">
          ← → move · ↑ rotate · ↓ soft drop · Space hard drop
        </div>
      </div>
      <div className="tetris-canvas-wrap">
        <Application
          width={width}
          height={height}
          background="#0f0f1a"
          antialias
        >
          <GameLoop setState={setState} />
          <pixiContainer>
            <BorderBg />
            <Playfield state={state} />
          </pixiContainer>
        </Application>
      </div>
      {(state.status === 'paused' || state.status === 'gameover') && (
        <div className="tetris-overlay">
          <span>
            {state.status === 'gameover' ? 'Game Over' : 'Paused'}
          </span>
        </div>
      )}
    </div>
  )
}
