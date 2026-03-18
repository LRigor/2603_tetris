import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addGarbageRow,
  type GameState,
  advanceEffects,
  getDropIntervalMs,
  getGarbageIntervalMs,
  hardDrop,
  initState,
  moveLeft,
  moveRight,
  pauseGame,
  resumeGame,
  rotate,
  softDrop,
  startGame,
  tick,
} from './tetris'

export function useGameController() {
  const [state, setState] = useState<GameState>(initState)
  const frameRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number>(0)
  const dropElapsedRef = useRef<number>(0)
  const garbageElapsedRef = useRef<number>(0)

  useEffect(() => {
    const loop = (now: number) => {
      if (lastFrameRef.current === 0) lastFrameRef.current = now
      const deltaMs = now - lastFrameRef.current
      lastFrameRef.current = now

      setState((current) => {
        let next = advanceEffects(current, deltaMs)

        if (next.status !== 'playing') {
          dropElapsedRef.current = 0
          garbageElapsedRef.current = 0
          return next
        }

        dropElapsedRef.current += deltaMs
        const interval = getDropIntervalMs(next.level)
        if (dropElapsedRef.current >= interval) {
          dropElapsedRef.current %= interval
          next = tick(next)
        }

        if (next.status === 'playing') {
          garbageElapsedRef.current += deltaMs
          const garbageInterval = getGarbageIntervalMs(next.level)
          while (garbageElapsedRef.current >= garbageInterval && next.status === 'playing') {
            garbageElapsedRef.current -= garbageInterval
            next = addGarbageRow(next)
          }
        }

        return next
      })

      frameRef.current = window.requestAnimationFrame(loop)
    }

    frameRef.current = window.requestAnimationFrame(loop)
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    }
  }, [])

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

  const handleNewGame = useCallback(() => {
    lastFrameRef.current = 0
    dropElapsedRef.current = 0
    garbageElapsedRef.current = 0
    setState(() => startGame(initState()))
  }, [])

  const handlePause = useCallback(() => {
    setState((s) => (s.status === 'playing' ? pauseGame(s) : resumeGame(s)))
  }, [])

  return {
    state,
    handleNewGame,
    handlePause,
  }
}
