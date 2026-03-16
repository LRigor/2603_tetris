/**
 * Tetris game logic - pure state & actions.
 * Board: 10 cols x 20 rows. Origin top-left.
 */

export const COLS = 10
export const ROWS = 20
export const CELL_SIZE = 24

export type Cell = number // 0 = empty, 1-7 = piece color index
export type Board = Cell[][]

// Standard tetromino shapes [row][col], 4x4. Value 1 = filled.
const SHAPES: number[][][] = [
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[1,1,0,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]], // O
  [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]], // S
  [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]], // Z
  [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]], // T
  [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]], // L
  [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]], // J
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

export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover'

export interface GameState {
  board: Board
  piece: Piece | null
  nextPieceType: PieceType
  score: number
  level: number
  lines: number
  status: GameStatus
}

function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0))
}

function getShape(type: PieceType, rotation: number): number[][] {
  const s = SHAPES[type]
  const r = rotation % 4
  if (r === 0) return s.map(row => [...row])
  let out = s
  for (let i = 0; i < r; i++) {
    const next: number[][] = []
    for (let c = 0; c < 4; c++) {
      next.push(out.map(row => row[c]).reverse())
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

function collides(board: Board, piece: Piece): boolean {
  const cells = getPieceCells(piece)
  for (const { r, c } of cells) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true
    if (board[r][c]) return true
  }
  return false
}

function mergePiece(board: Board, piece: Piece): Board {
  const next = board.map(row => [...row])
  const color = piece.type + 1
  for (const { r, c } of getPieceCells(piece)) {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) next[r][c] = color
  }
  return next
}

function clearLines(board: Board): { board: Board; cleared: number } {
  const full: number[] = []
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every(c => c !== 0)) full.push(r)
  }
  if (full.length === 0) return { board, cleared: 0 }
  const newRows = board.filter((_, r) => !full.includes(r))
  const empty = Array.from({ length: full.length }, () => Array(COLS).fill(0))
  const newBoard = [...empty, ...newRows]
  return { board: newBoard, cleared: full.length }
}

function randomPieceType(): PieceType {
  return Math.floor(Math.random() * 7) as PieceType
}

function spawnPiece(col: number): Piece {
  return {
    type: randomPieceType(),
    row: 0,
    col: Math.max(0, Math.min(col, COLS - 4)),
    rotation: 0,
  }
}

export function initState(): GameState {
  return {
    board: createEmptyBoard(),
    piece: spawnPiece(3),
    nextPieceType: randomPieceType(),
    score: 0,
    level: 1,
    lines: 0,
    status: 'idle',
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

function lockAndSpawn(state: GameState): GameState {
  if (!state.piece) return state
  let board = mergePiece(state.board, state.piece)
  const { board: afterClear, cleared } = clearLines(board)
  const points = [0, 100, 300, 500, 800]
  const score = state.score + (points[cleared] ?? 800) * state.level
  const lines = state.lines + cleared
  const level = Math.floor(lines / 10) + 1
  const nextType = state.nextPieceType
  const newPiece: Piece = {
    type: nextType,
    row: 0,
    col: 3,
    rotation: 0,
  }
  if (collides(afterClear, newPiece)) {
    return {
      ...state,
      board: afterClear,
      piece: null,
      score,
      level,
      lines,
      status: 'gameover',
    }
  }
  return {
    ...state,
    board: afterClear,
    piece: newPiece,
    nextPieceType: randomPieceType(),
    score,
    level,
    lines,
  }
}

export function moveLeft(state: GameState): GameState {
  if (state.status !== 'playing' || !state.piece) return state
  const next: Piece = { ...state.piece, col: state.piece.col - 1 }
  if (collides(state.board, next)) return state
  return { ...state, piece: next }
}

export function moveRight(state: GameState): GameState {
  if (state.status !== 'playing' || !state.piece) return state
  const next: Piece = { ...state.piece, col: state.piece.col + 1 }
  if (collides(state.board, next)) return state
  return { ...state, piece: next }
}

export function rotate(state: GameState): GameState {
  if (state.status !== 'playing' || !state.piece) return state
  const next: Piece = { ...state.piece, rotation: (state.piece.rotation + 1) % 4 }
  if (collides(state.board, next)) return state
  return { ...state, piece: next }
}

export function softDrop(state: GameState): GameState {
  if (state.status !== 'playing' || !state.piece) return state
  const next: Piece = { ...state.piece, row: state.piece.row + 1 }
  if (collides(state.board, next)) return lockAndSpawn(state)
  return { ...state, piece: next, score: state.score + 1 }
}

export function hardDrop(state: GameState): GameState {
  if (state.status !== 'playing' || !state.piece) return state
  let s = state
  while (s.piece) {
    const next: Piece = { ...s.piece, row: s.piece.row + 1 }
    if (collides(s.board, next)) return lockAndSpawn(s)
    s = { ...s, piece: next, score: s.score + 2 }
  }
  return s
}

export function tick(state: GameState, _dropIntervalMs?: number): GameState {
  if (state.status !== 'playing') return state
  return softDrop(state)
}

export function getDropIntervalMs(level: number): number {
  return Math.max(100, 1000 - (level - 1) * 80)
}
