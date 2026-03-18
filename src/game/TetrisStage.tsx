import { Box, Paper, Typography } from '@mui/material'
import { type CSSProperties, useMemo } from 'react'
import { BOARD_CANVAS_RATIO, TetrisBoardCanvas } from './TetrisBoardCanvas'
import { TetrisPrimaryPanel, TetrisSecondaryPanel } from './TetrisHud'
import { ROWS, getDropIntervalMs } from './tetris'
import { useGameController } from './useGameController'

export default function TetrisStage() {
  const { state, handleNewGame, handlePause } = useGameController()

  const boardMeta =
    state.status === 'playing'
      ? `${getDropIntervalMs(state.level)}ms pace`
      : state.status === 'paused'
        ? 'Paused'
        : state.status === 'clearing'
          ? 'Clearing'
          : state.status === 'gameover'
            ? `Restart ${ROWS} rows`
            : 'Press Start'

  const boardShellStyle = useMemo(() => {
    if (state.impactMs <= 0) return undefined
    const intensity = Math.min(1, state.impactMs / 140)
    const translateY = Math.sin(state.impactMs * 0.22) * intensity * 6
    const rotate = Math.sin(state.impactMs * 0.12) * intensity * 0.8
    return {
      transform: `translateY(${translateY.toFixed(2)}px) rotate(${rotate.toFixed(2)}deg)`,
    }
  }, [state.impactMs])

  return (
    <Box
      component="section"
      className="tetris-wrap"
      style={
        {
          '--board-ratio': String(BOARD_CANVAS_RATIO),
        } as CSSProperties
      }
    >
      <Box className="tetris-shell">
        <TetrisPrimaryPanel state={state} onNewGame={handleNewGame} onPause={handlePause} />

        <Box className="tetris-board-column">
          <Paper className="board-meta" elevation={0}>
            <Typography className="board-meta-label" component="span">
              {ROWS} Rows
            </Typography>
            <Typography className="board-meta-value" component="strong">
              {boardMeta}
            </Typography>
          </Paper>

          <Box className="tetris-board-shell" style={boardShellStyle}>
            <Box className="tetris-canvas-wrap">
              <TetrisBoardCanvas state={state} />
            </Box>

            {(state.status === 'paused' || state.status === 'gameover') && (
              <Box className="tetris-overlay">
                <Typography component="span">{state.status === 'gameover' ? 'Game Over' : 'Paused'}</Typography>
              </Box>
            )}
          </Box>
        </Box>

        <TetrisSecondaryPanel state={state} />
      </Box>
    </Box>
  )
}
