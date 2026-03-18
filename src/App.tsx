import { CssBaseline, GlobalStyles, Paper, ThemeProvider, Typography, createTheme } from '@mui/material'
import TetrisStage from './game/TetrisStage'
import './App.css'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#c97a45',
      dark: '#9b5630',
      light: '#e7a876',
      contrastText: '#fffaf4',
    },
    secondary: {
      main: '#d8c1a6',
      dark: '#b99874',
      light: '#efe1d0',
      contrastText: '#5b3923',
    },
    background: {
      default: '#f4e6d3',
      paper: '#fffaf2',
    },
    text: {
      primary: '#432918',
      secondary: '#7a604d',
    },
  },
  shape: {
    borderRadius: 24,
  },
  typography: {
    fontFamily: "Inter, system-ui, 'Segoe UI', Roboto, sans-serif",
    button: {
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      fontWeight: 700,
    },
    overline: {
      letterSpacing: '0.14em',
      fontWeight: 700,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage:
            'linear-gradient(180deg, rgba(255, 251, 245, 0.94), rgba(248, 237, 220, 0.9)), linear-gradient(135deg, rgba(255,255,255,0.28), transparent 48%)',
          boxShadow: '0 18px 40px rgba(106, 67, 34, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
          border: '1px solid rgba(147, 104, 68, 0.12)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 38,
          borderRadius: 16,
          boxShadow: '0 10px 20px rgba(91, 53, 26, 0.14)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        },
      },
    },
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          body: {
            background:
              'radial-gradient(circle at top, rgba(255, 255, 255, 0.7), transparent 22%), radial-gradient(circle at 20% 20%, rgba(255, 222, 188, 0.42), transparent 28%), linear-gradient(180deg, #f9efe3 0%, #ecd2b2 52%, #d5a273 100%)',
          },
        }}
      />
      <main className="app">
        <Paper className="header" elevation={0}>
          <Typography component="h1" variant="h4" className="header-title">
            2603 Tetris
          </Typography>
          <Typography variant="body2" className="header-subtitle">
            Modern arcade dashboard · React + PixiJS
          </Typography>
        </Paper>
        <TetrisStage />
      </main>
    </ThemeProvider>
  )
}

export default App
