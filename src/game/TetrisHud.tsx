import { Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { type CSSProperties } from 'react'
import { type GameState, type PieceType, PIECE_COLORS, ROWS, getPieceCells } from './tetris'

const PIECE_NAMES: string[] = ['I Beam', 'Square', 'S Curve', 'Z Ridge', 'T Joint', 'L Corner', 'J Corner']

const CONTROLS = [
  ['Move', 'Left / Right'],
  ['Rotate', 'Up'],
  ['Soft Drop', 'Down'],
  ['Hard Drop', 'Space'],
]

function colorToHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

function PiecePreview({
  type,
  compact = false,
  disabled = false,
}: {
  type: PieceType | null
  compact?: boolean
  disabled?: boolean
}) {
  if (type === null) {
    return (
      <div className={`piece-preview${compact ? ' is-compact' : ''}${disabled ? ' is-disabled' : ''}`}>
        <div className="piece-grid" aria-hidden="true">
          {Array.from({ length: 16 }, (_, index) => (
            <span key={index} className="piece-cell" />
          ))}
        </div>
        <div className="piece-caption">Empty</div>
      </div>
    )
  }

  const cells = getPieceCells({ type, row: 0, col: 0, rotation: 0 })
  const minRow = Math.min(...cells.map((cell) => cell.r))
  const minCol = Math.min(...cells.map((cell) => cell.c))
  const occupied = new Set(cells.map((cell) => `${cell.r - minRow}:${cell.c - minCol}`))
  const pieceColor = colorToHex(PIECE_COLORS[type] ?? 0xb56b3b)

  return (
    <div className={`piece-preview${compact ? ' is-compact' : ''}${disabled ? ' is-disabled' : ''}`}>
      <div className="piece-grid" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => {
          const row = Math.floor(index / 4)
          const col = index % 4
          const filled = occupied.has(`${row}:${col}`)
          const style = filled
            ? ({
                backgroundColor: pieceColor,
                borderColor: pieceColor,
              } satisfies CSSProperties)
            : undefined

          return <span key={`${row}-${col}`} className={`piece-cell${filled ? ' is-filled' : ''}`} style={style} />
        })}
      </div>
      <div className="piece-caption">{PIECE_NAMES[type]}</div>
    </div>
  )
}

export function TetrisPrimaryPanel({
  state,
  onNewGame,
  onPause,
}: {
  state: GameState
  onNewGame: () => void
  onPause: () => void
}) {
  const statusLabel =
    state.status === 'playing'
      ? 'Live'
      : state.status === 'paused'
        ? 'Paused'
        : state.status === 'clearing'
          ? 'Clearing'
          : state.status === 'gameover'
            ? 'Game Over'
            : 'Ready'

  const stats = [
    ['Score', state.score.toLocaleString()],
    ['Level', String(state.level)],
    ['Lines', String(state.lines)],
    ['Rows', String(ROWS)],
  ]

  return (
    <Paper component="aside" className="tetris-panel" elevation={0}>
      <Stack className="panel-intro">
        <Typography className="panel-kicker" variant="overline">
          Crafted Arcade
        </Typography>
        <Typography className="panel-title" variant="h5" component="h2">
          3D Wood Board
        </Typography>
        <Typography className="panel-copy" variant="body2">
          Full gameplay systems, smoother motion, and cleaner interaction patterns for a more complete mini-game
          experience.
        </Typography>
      </Stack>

      <Chip className={`status-pill is-${state.status}`} label={statusLabel} />

      <div className="stats-grid">
        {stats.map(([label, value]) => (
          <Paper key={label} className="stat-card" elevation={0}>
            <Typography className="stat-label" variant="overline">
              {label}
            </Typography>
            <Typography className="stat-value" component="strong" variant="h6">
              {value}
            </Typography>
          </Paper>
        ))}
      </div>

      <div className="tetris-actions">
        <Button type="button" variant="contained" color="primary" className="btn btn-primary" onClick={onNewGame}>
          {state.status === 'idle' ? 'New Game' : 'Restart'}
        </Button>
        <Button
          type="button"
          variant="contained"
          color="secondary"
          className="btn btn-secondary"
          onClick={onPause}
          disabled={state.status === 'idle' || state.status === 'gameover'}
        >
          {state.status === 'paused' ? 'Resume' : 'Pause'}
        </Button>
      </div>
    </Paper>
  )
}

export function TetrisSecondaryPanel({ state }: { state: GameState }) {
  return (
    <Paper component="aside" className="tetris-panel" elevation={0}>
      <Paper className="info-card" elevation={0}>
        <Typography className="card-title" variant="overline">
          Next Queue
        </Typography>
        <div className="queue-stack">
          {state.nextQueue.slice(0, 3).map((type, index) => (
            <Paper key={`${type}-${index}`} className="queue-card" elevation={0}>
              <Typography className="queue-index" variant="overline">
                Next {index + 1}
              </Typography>
              <PiecePreview type={type} compact />
            </Paper>
          ))}
        </div>
      </Paper>

      <Paper className="info-card" elevation={0}>
        <Typography className="card-title" variant="overline">
          Controls
        </Typography>
        <div className="controls-list">
          {CONTROLS.map(([label, value]) => (
            <div key={label} className="control-row">
              <Typography component="span" variant="body2">
                {label}
              </Typography>
              <Typography component="strong" variant="body2">
                {value}
              </Typography>
            </div>
          ))}
        </div>
      </Paper>

      <Paper className="info-card" elevation={0}>
        <Typography className="card-title" variant="overline">
          Game Feel
        </Typography>
        <Typography className="panel-note" variant="body2">
          Active pieces animate into place, line clears flash before collapsing, and landings add stage impact so
          the board feels more alive.
        </Typography>
      </Paper>
    </Paper>
  )
}
