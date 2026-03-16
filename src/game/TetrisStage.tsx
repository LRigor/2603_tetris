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
const PAD = 6
const BORDER = 6

function multiplyColor(color: number, factor: number): number {
  const r = Math.min(255, Math.max(0, ((color >> 16) & 0xff) * factor))
  const g = Math.min(255, Math.max(0, ((color >> 8) & 0xff) * factor))
  const b = Math.min(255, Math.max(0, (color & 0xff) * factor))
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
}

function drawCell(g: Graphics, x: number, y: number, color: number, isGhost = false) {
  const size = CELL_SIZE - 1
  const radius = 4
  const base = multiplyColor(color, 0.9)
  const light = multiplyColor(color, 1.12)
  const dark = multiplyColor(color, 0.65)

  g.roundRect(x, y, size, size, radius)
  if (isGhost) {
    g.fill({ color: light, alpha: 0.28 })
    g.stroke({ width: 1, color: 0xffffff, alpha: 0.4 })
    return
  }

  // Base wood block
  g.fill({ color: base })
  g.stroke({ width: 1.5, color: dark, alpha: 0.95 })

  // Inner beveled face
  const inset = 3
  g.roundRect(x + inset, y + inset, size - inset * 2, size - inset * 2, radius - 1)
  g.fill({ color: light, alpha: 0.95 })

  // Top highlight strip
  g.rect(x + inset, y + inset, size - inset * 2, (size - inset * 2) * 0.32)
  g.fill({ color: 0xffffff, alpha: 0.20 })

  // Bottom shadow strip
  g.rect(
    x + inset,
    y + inset + (size - inset * 2) * 0.6,
    size - inset * 2,
    (size - inset * 2) * 0.4,
  )
  g.fill({ color: dark, alpha: 0.45 })
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

    const outerRadius = 18
    const innerRadius = 14

    // Desk wood outer frame
    g.roundRect(0, 0, BOARD_PX + BORDER * 2, BOARD_PY + BORDER * 2, outerRadius)
    g.fill({ color: 0x3b2615 })
    g.stroke({ width: 2, color: 0x1c120a, alpha: 0.9 })

    // Inner lighter panel
    const inset = 6
    const innerW = BOARD_PX + BORDER * 2 - inset * 2
    const innerH = BOARD_PY + BORDER * 2 - inset * 2
    g.roundRect(inset, inset, innerW, innerH, innerRadius)
    g.fill({ color: 0x705033 })

    // Subtle vertical plank lines
    const plankWidth = CELL_SIZE * 2
    for (let x = inset + plankWidth; x < inset + innerW; x += plankWidth) {
      g.moveTo(x, inset + 2)
      g.lineTo(x, inset + innerH - 2)
      g.stroke({ width: 1, color: 0x5a4129, alpha: 0.35 })
    }

    // Soft inner glow
    g.roundRect(inset + 2, inset + 2, innerW - 4, innerH - 4, innerRadius - 2)
    g.stroke({ width: 2, color: 0x8a6640, alpha: 0.45 })
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
          background={0x1b130c}
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
