import TetrisStage from './game/TetrisStage'
import './App.css'

function App() {
  return (
    <main className="app">
      <header className="header">
        <h1>2603 Tetris</h1>
        <p>React + PixiJS · H5 单机 Demo</p>
      </header>
      <TetrisStage />
    </main>
  )
}

export default App
