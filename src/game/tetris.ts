/**
 * Tetris game logic - pure state & actions.
 * Board: 21 cols x 40 visible rows plus hidden spawn rows. Origin top-left.
 */

export const COLS = 21
export const ROWS = 40
export const HIDDEN_ROWS = 2
export const TOTAL_ROWS = ROWS + HIDDEN_ROWS
export const CELL_SIZE = 20
export const NEXT_QUEUE_SIZE = 3
export const CLEAR_ANIMATION_MS = 340
export const IMPACT_ANIMATION_MS = 140
export const GARBAGE_IMPACT_MS = 180
export const GARBAGE_ANIMATION_MS = 280

export type Cell = number // 0 = empty, 1-7 = piece color index
export type Board = Cell[][]

// Standard tetromino shapes [row][col], 4x4. Value 1 = filled.
const SHAPES: number[][][] = [
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[1, 1, 0, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], // O
  [[0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], // S
  [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]], // Z
  [[0, 1, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]], // T
  [[1, 0, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]], // L
  [[0, 0, 1, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]], // J
]

// Warm wood-like palette for pieces
export const PIECE_COLORS: number[] = [
  0xc99a6b, // I - light oak
  0xd9b583, // O - maple
  0xb17a4b, // S - walnut
  0x8c5a3a, // Z - deep mahogany
  0xe0c19a, // T - birch
  0xa26b3f, // L - teak
  0x7b4a2a, // J - dark cherry
]

export type PieceType = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Piece {
  type: PieceType
  row: number
  col: number
  rotation: number // 0-3
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'clearing' | 'gameover'

export interface GameState {
  board: Board
  piece: Piece | null
  nextQueue: PieceType[]
  holdPieceType: PieceType | null
  canHold: boolean
  score: number
  level: number
  lines: number
  status: GameStatus
  clearingRows: number[]
  clearElapsedMs: number
  impactMs: number
  incomingGarbageRow: Cell[] | null
  garbageElapsedMs: number
}

function createEmptyBoard(): Board {
  return Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(0))
}

function randomPieceType(): PieceType {
  return Math.floor(Math.random() * 7) as PieceType
}

function randomCellValue(): Cell {
  return (randomPieceType() + 1) as Cell
}

function getSpawnColumns(): number[] {
  const maxCol = COLS - 4
  const center = Math.floor(maxCol / 2)
  return Array.from({ length: maxCol + 1 }, (_, col) => col).sort((a, b) => {
    const distanceDiff = Math.abs(a - center) - Math.abs(b - center)
    return distanceDiff !== 0 ? distanceDiff : a - b
  })
}

function fillQueue(queue: PieceType[], size = NEXT_QUEUE_SIZE): PieceType[] {
  const nextQueue = [...queue]
  while (nextQueue.length < size) nextQueue.push(randomPieceType())
  return nextQueue
}

function createPiece(type: PieceType, col = Math.floor((COLS - 4) / 2)): Piece {
  return {
    type,
    row: 0,
    col: Math.max(0, Math.min(col, COLS - 4)),
    rotation: 0,
  }
}

function getShape(type: PieceType, rotation: number): number[][] {
  const s = SHAPES[type]
  const r = rotation % 4
  if (r === 0) return s.map((row) => [...row])
  let out = s
  for (let i = 0; i < r; i++) {
    const next: number[][] = []
    for (let c = 0; c < 4; c++) {
      next.push(out.map((row) => row[c]).reverse())
    }
    out = next
  }
  return out
}

export function getPieceCells(piece: Piece): { r: number; c: number }[] {
  const shape = getShape(piece.type, piece.rotation)
  const cells: { r: number; c: number }[] = []
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (shape[row][col]) cells.push({ r: piece.row + row, c: piece.col + col })
    }
  }
  return cells
}

function hasCellsAboveTop(piece: Piece): boolean {
  return getPieceCells(piece).some(({ r }) => r < 0)
}

function collides(board: Board, piece: Piece): boolean {
  for (const { r, c } of getPieceCells(piece)) {
    if (r >= TOTAL_ROWS || c < 0 || c >= COLS) return true
    if (r >= 0 && board[r][c]) return true
  }
  return false
}

function mergePiece(board: Board, piece: Piece): Board {
  const next = board.map((row) => [...row])
  const color = piece.type + 1
  for (const { r, c } of getPieceCells(piece)) {
    if (r >= 0 && r < TOTAL_ROWS && c >= 0 && c < COLS) next[r][c] = color
  }
  return next
}

function getFullRows(board: Board): number[] {
  const full: number[] = []
  for (let r = 0; r < TOTAL_ROWS; r++) {
    if (board[r].every((c) => c !== 0)) full.push(r)
  }
  return full
}

function removeRows(board: Board, rowsToRemove: number[]): Board {
  if (rowsToRemove.length === 0) return board
  const set = new Set(rowsToRemove)
  const newRows = board.filter((_, r) => !set.has(r))
  const empty = Array.from({ length: rowsToRemove.length }, () => Array(COLS).fill(0))
  return [...empty, ...newRows]
}

function pointsForLines(cleared: number): number {
  return [0, 100, 300, 500, 800][cleared] ?? 800
}

function createSpawnPiece(board: Board, type: PieceType): Piece | null {
  for (const col of getSpawnColumns()) {
    const piece = createPiece(type, col)
    if (!collides(board, piece)) return piece
  }
  return null
}

function spawnFromQueue(state: GameState): GameState {
  const nextQueue = fillQueue(state.nextQueue)
  const [type, ...rest] = nextQueue
  const piece = createSpawnPiece(state.board, type)
  if (!piece) {
    return {
      ...state,
      piece: null,
      nextQueue: fillQueue(rest),
      status: 'gameover',
    }
  }
  return {
    ...state,
    piece,
    nextQueue: fillQueue(rest),
    canHold: true,
    status: 'playing',
  }
}

function lockPiece(state: GameState, impactMs = IMPACT_ANIMATION_MS): GameState {
  if (!state.piece) return state
  if (hasCellsAboveTop(state.piece)) {
    return {
      ...state,
      piece: null,
      status: 'gameover',
      impactMs: Math.max(state.impactMs, impactMs),
      incomingGarbageRow: null,
      garbageElapsedMs: 0,
    }
  }

  const board = mergePiece(state.board, state.piece)
  const clearingRows = getFullRows(board)

  if (clearingRows.length > 0) {
    return {
      ...state,
      board,
      piece: null,
      clearingRows,
      clearElapsedMs: 0,
      impactMs: Math.max(state.impactMs, impactMs),
      canHold: false,
      status: 'clearing',
    }
  }

  return spawnFromQueue({
    ...state,
    board,
    piece: null,
    impactMs: Math.max(state.impactMs, impactMs),
    canHold: false,
  })
}

export function initState(): GameState {
  const firstType = randomPieceType()
  return {
    board: createEmptyBoard(),
    piece: createSpawnPiece(createEmptyBoard(), firstType),
    nextQueue: fillQueue([]),
    holdPieceType: null,
    canHold: true,
    score: 0,
    level: 1,
    lines: 0,
    status: 'idle',
    clearingRows: [],
    clearElapsedMs: 0,
    impactMs: 0,
    incomingGarbageRow: null,
    garbageElapsedMs: 0,
  }
}

export function startGame(state: GameState): GameState {
  if (state.status === 'gameover' || state.status === 'idle') {
    const fresh = initState()
    return { ...fresh, status: 'playing' }
  }
  if (state.status === 'paused') return { ...state, status: 'playing' }
  return state
}

export function pauseGame(state: GameState): GameState {
  if (state.status === 'playing') return { ...state, status: 'paused' }
  return state
}

export function resumeGame(state: GameState): GameState {
  if (state.status === 'paused') return { ...state, status: 'playing' }
  return state
}

export function advanceEffects(state: GameState, deltaMs: number): GameState {
  let nextState = state

  if (nextState.impactMs > 0) {
    nextState = {
      ...nextState,
      impactMs: Math.max(0, nextState.impactMs - deltaMs),
    }
  }

  if (nextState.incomingGarbageRow && nextState.status === 'playing') {
    const garbageElapsedMs = nextState.garbageElapsedMs + deltaMs
    if (garbageElapsedMs < GARBAGE_ANIMATION_MS) {
      nextState = {
        ...nextState,
        garbageElapsedMs,
      }
    } else {
      const board = [...nextState.board.slice(1), nextState.incomingGarbageRow]
      const stackOverflowed = nextState.board[0].some((cell) => cell !== 0)

      if (stackOverflowed) {
        return {
          ...nextState,
          board,
          piece: null,
          status: 'gameover',
          impactMs: Math.max(nextState.impactMs, GARBAGE_IMPACT_MS),
          incomingGarbageRow: null,
          garbageElapsedMs: 0,
        }
      }

      if (!nextState.piece) {
        nextState = {
          ...nextState,
          board,
          incomingGarbageRow: null,
          garbageElapsedMs: 0,
          impactMs: Math.max(nextState.impactMs, GARBAGE_IMPACT_MS),
        }
      } else {
        let nextPiece = nextState.piece
        while (collides(board, nextPiece)) {
          nextPiece = { ...nextPiece, row: nextPiece.row - 1 }
        }

        nextState = {
          ...nextState,
          board,
          piece: nextPiece,
          incomingGarbageRow: null,
          garbageElapsedMs: 0,
          impactMs: Math.max(nextState.impactMs, GARBAGE_IMPACT_MS),
        }
      }
    }
  }

  if (nextState.status !== 'clearing') return nextState

  const clearElapsedMs = nextState.clearElapsedMs + deltaMs
  if (clearElapsedMs < CLEAR_ANIMATION_MS) {
    return {
      ...nextState,
      clearElapsedMs,
    }
  }

  const cleared = nextState.clearingRows.length
  const board = removeRows(nextState.board, nextState.clearingRows)
  const lines = nextState.lines + cleared
  const level = Math.floor(lines / 10) + 1
  const score = nextState.score + pointsForLines(cleared) * nextState.level

  return spawnFromQueue({
    ...nextState,
    board,
    score,
    lines,
    level,
    clearingRows: [],
    clearElapsedMs: 0,
    status: 'playing',
  })
}

export function moveLeft(state: GameState): GameState {
  if (state.status !== 'playing' || !state.piece) return state
  const next = { ...state.piece, col: state.piece.col - 1 }
  if (collides(state.board, next)) return state
  return { ...state, piece: next }
}

export function moveRight(state: GameState): GameState {
  if (state.status !== 'playing' || !state.piece) return state
  const next = { ...state.piece, col: state.piece.col + 1 }
  if (collides(state.board, next)) return state
  return { ...state, piece: next }
}

export function rotate(state: GameState): GameState {
  if (state.status !== 'playing' || !state.piece) return state

  const rotated = { ...state.piece, rotation: (state.piece.rotation + 1) % 4 }
  const kickTests = [0, -1, 1, -2, 2]
  for (const offset of kickTests) {
    const next = { ...rotated, col: rotated.col + offset }
    if (!collides(state.board, next)) return { ...state, piece: next }
  }

  return state
}

export function holdPiece(state: GameState): GameState {
  if (state.status !== 'playing' || !state.piece || !state.canHold) return state

  const outgoingType = state.piece.type
  if (state.holdPieceType === null) {
    const nextQueue = fillQueue(state.nextQueue)
    const [type, ...rest] = nextQueue
    const piece = createSpawnPiece(state.board, type)

    if (!piece) {
      return {
        ...state,
        piece: null,
        nextQueue: fillQueue(rest),
        holdPieceType: outgoingType,
        canHold: false,
        status: 'gameover',
      }
    }

    return {
      ...state,
      piece,
      nextQueue: fillQueue(rest),
      holdPieceType: outgoingType,
      canHold: false,
    }
  }

  const piece = createSpawnPiece(state.board, state.holdPieceType)
  if (!piece) {
    return {
      ...state,
      piece: null,
      holdPieceType: outgoingType,
      canHold: false,
      status: 'gameover',
    }
  }

  return {
    ...state,
    piece,
    holdPieceType: outgoingType,
    canHold: false,
  }
}

export function addGarbageRow(state: GameState): GameState {
  if (state.status !== 'playing' || state.incomingGarbageRow) return state

  const holeCol = Math.floor(Math.random() * COLS)
  const garbageRow: Cell[] = Array.from({ length: COLS }, (_, col) => (col === holeCol ? 0 : randomCellValue()))

  return {
    ...state,
    incomingGarbageRow: garbageRow,
    garbageElapsedMs: 0,
  }
}

export function softDrop(state: GameState): GameState {
  if (state.status !== 'playing' || !state.piece) return state
  const next = { ...state.piece, row: state.piece.row + 1 }
  if (collides(state.board, next)) return lockPiece(state)
  return { ...state, piece: next, score: state.score + 1 }
}

export function hardDrop(state: GameState): GameState {
  if (state.status !== 'playing' || !state.piece) return state

  let dropped = 0
  let piece = state.piece
  while (true) {
    const next = { ...piece, row: piece.row + 1 }
    if (collides(state.board, next)) break
    piece = next
    dropped++
  }

  const landedState = {
    ...state,
    piece,
    score: state.score + dropped * 2,
  }

  return lockPiece(landedState, IMPACT_ANIMATION_MS + 80)
}

export function tick(state: GameState): GameState {
  if (state.status !== 'playing') return state
  return softDrop(state)
}

export function getDropIntervalMs(level: number): number {
  return Math.max(100, 1000 - (level - 1) * 80)
}

export function getGarbageIntervalMs(level: number): number {
  return Math.max(3200, 7600 - (level - 1) * 260)
}
