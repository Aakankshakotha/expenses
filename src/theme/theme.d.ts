import '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    charts: {
      categorical: string[]
    }
    sidebar: {
      bg: string
      text: string
      border: string
      hover: string
      accent: string
    }
  }
  interface PaletteOptions {
    charts?: {
      categorical?: string[]
    }
    sidebar?: {
      bg?: string
      text?: string
      border?: string
      hover?: string
      accent?: string
    }
  }
}
