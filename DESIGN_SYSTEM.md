# Masaniello Dashboard — Design System Guide

## 📋 Overview

Questo documento descrive il nuovo design system per il redesign del Masaniello Dashboard. Il sistema è basato su un'estetica moderna, premium e professionale per applicazioni di trading.

## 🎨 Design Tokens

### Colori

#### Background Layers
```css
--bg-deep:     #090d14  /* Sfondo principale */
--bg-card:     #0f1623  /* Card e pannelli */
--bg-surface:  #141d2e  /* Superfici elevate */
--bg-elevated: #1a2540  /* Elementi hover/attivi */
```

#### Borders
```css
--border:       rgba(255,255,255,0.06)  /* Bordi standard */
--border-hover: rgba(255,255,255,0.12)  /* Bordi hover */
--border-glow:  rgba(99,179,237,0.25)   /* Bordi con glow */
```

#### Text
```css
--txt-primary:   #e8edf5  /* Testo principale */
--txt-secondary: #7f92b0  /* Testo secondario */
--txt-muted:     #3d4f6a  /* Testo disabilitato */
```

#### Accents
```css
--accent-blue:   #3b82f6  /* Azioni primarie */
--accent-teal:   #06b6d4  /* Accenti secondari */
--accent-green:  #22c55e  /* Profitti/successo */
--accent-gold:   #f59e0b  /* Master account */
--accent-red:    #ef4444  /* Perdite/errori */
--accent-purple: #a855f7  /* Accenti speciali */
```

### Typography

#### Font Families
- **Display**: `Syne` - Per titoli e heading importanti
- **Sans**: `DM Sans` - Per testo body e UI
- **Mono**: `DM Mono` - Per valori numerici e codice

#### Font Sizes
```css
.text-xs   { font-size: 10px; letter-spacing: 0.08em; }
.text-sm   { font-size: 12px; }
.text-base { font-size: 14px; }
.text-lg   { font-size: 16px; }
.text-xl   { font-size: 18px; }
.text-2xl  { font-size: 22px; }
.text-3xl  { font-size: 28px; }
.text-4xl  { font-size: 38px; }
```

### Spacing
```css
--space-xs:  4px
--space-sm:  8px
--space-md:  16px
--space-lg:  24px
--space-xl:  32px
--space-2xl: 48px
```

### Border Radius
```css
--radius-sm: 6px   /* Piccoli elementi */
--radius-md: 12px  /* Card e pannelli */
--radius-lg: 18px  /* Card grandi */
--radius-xl: 24px  /* Elementi hero */
```

### Shadows
```css
--shadow-card: 0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset
--shadow-glow-blue:  0 0 24px rgba(59,130,246,0.2)
--shadow-glow-green: 0 0 24px rgba(34,197,94,0.2)
--shadow-glow-gold:  0 0 24px rgba(245,158,11,0.2)
```

## 🧩 Componenti

### Cards

```tsx
<div className="card-redesign">
  <div className="card-header-redesign">
    <h3 className="card-title-redesign">Titolo Card</h3>
  </div>
  <div className="card-body-redesign">
    {/* Contenuto */}
  </div>
</div>
```

### Buttons

```tsx
{/* Primary */}
<button className="btn-redesign btn-primary-redesign">
  Azione Primaria
</button>

{/* Ghost */}
<button className="btn-redesign btn-ghost-redesign">
  Azione Secondaria
</button>

{/* Success */}
<button className="btn-redesign btn-success-redesign">
  ✓ Vinta
</button>

{/* Danger */}
<button className="btn-redesign btn-danger-redesign">
  ✕ Elimina
</button>
```

### Badges

```tsx
{/* Master */}
<span className="badge-redesign badge-master">MASTER</span>

{/* Slave */}
<span className="badge-redesign badge-slave">SLAVE</span>

{/* Profit */}
<span className="badge-redesign badge-profit">PROFIT</span>

{/* Loss */}
<span className="badge-redesign badge-loss">LOSS</span>
```

### Progress Bar

```tsx
<div className="progress-track-redesign">
  <div 
    className="progress-fill-redesign" 
    style={{ width: '45%' }}
  />
</div>
```

### Stat Display

```tsx
<div>
  <div className="stat-label-redesign">Profitto</div>
  <div className="stat-value-redesign stat-value-pos">
    +€300.79
  </div>
</div>
```

## 🎭 Effetti Speciali

### Ambient Glows

Aggiungi blob di luce ambientale:

```tsx
<div className="ambient ambient-1"></div>
<div className="ambient ambient-2"></div>
<div className="ambient ambient-3"></div>
```

### Animazioni

```tsx
{/* Fade up entrance */}
<div className="animate-fade-up">...</div>

{/* Pulsing dot */}
<div className="animate-pulse">...</div>
```

### Gradienti

```tsx
{/* Blue to Teal */}
<div className="gradient-blue-teal">...</div>

{/* Gold soft */}
<div className="gradient-gold">...</div>

{/* Blue soft */}
<div className="gradient-blue-soft">...</div>
```

### Glows

```tsx
<div className="glow-blue">...</div>
<div className="glow-green">...</div>
<div className="glow-gold">...</div>
```

## 📐 Layout Pattern

### Struttura Base

```tsx
<body className="redesign">
  {/* Ambient glows */}
  <div className="ambient ambient-1"></div>
  <div className="ambient ambient-2"></div>
  <div className="ambient ambient-3"></div>

  {/* Main shell */}
  <div className="shell">
    {/* Top bar */}
    <header className="topbar">...</header>
    
    {/* Tabs */}
    <div className="tabs-bar">...</div>
    
    {/* Content */}
    <main className="content">
      <div className="left-col">...</div>
      <div className="right-col">...</div>
    </main>
  </div>
</body>
```

## 🎯 Best Practices

### 1. Usa le Variabili CSS
```css
/* ✅ Corretto */
color: var(--txt-primary);
background: var(--bg-card);

/* ❌ Evita */
color: #e8edf5;
background: #0f1623;
```

### 2. Font Appropriati
- **Numeri/Valute**: Usa `font-mono` (DM Mono)
- **Titoli**: Usa `font-display` (Syne)
- **Testo UI**: Usa `font-sans` (DM Sans)

### 3. Consistenza Spacing
Usa sempre le variabili di spacing invece di valori hardcoded:
```css
padding: var(--space-md);
gap: var(--space-sm);
```

### 4. Transizioni Smooth
```css
transition: all var(--transition-base);
```

### 5. Semantic Colors
```tsx
{/* ✅ Corretto */}
<span className="stat-value-pos">+€100</span>

{/* ❌ Evita */}
<span style={{ color: '#22c55e' }}>+€100</span>
```

## 🔄 Migration Strategy

### Fase 1: Setup (✅ Completato)
- [x] Creato file `redesign.css`
- [x] Importato in `index.css`
- [x] Documentazione creata

### Fase 2: Componenti Base
1. Aggiornare `App.tsx` con layout shell
2. Creare TopBar component
3. Creare Tabs component
4. Aggiornare Card components

### Fase 3: Componenti Specifici
1. ActivePlan component
2. CapitalPoolManager component
3. ConfigurationPanel component
4. NewMasanielloForm component

### Fase 4: Polish
1. Animazioni
2. Responsive design
3. Accessibility
4. Performance optimization

## 📝 Note Implementazione

### Attivazione Redesign
Per attivare il redesign, aggiungi la classe `redesign` al body:

```tsx
// In App.tsx o index.html
<body className="redesign">
```

### Compatibilità
Il design system è progettato per coesistere con il CSS esistente. Le classi con suffisso `-redesign` non interferiranno con quelle esistenti.

### Testing
Testa sempre su:
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile viewport (responsive)

## 🚀 Quick Start

Per iniziare a usare il redesign su un componente:

```tsx
import React from 'react';

export const MyComponent = () => {
  return (
    <div className="card-redesign animate-fade-up">
      <div className="card-header-redesign">
        <h3 className="card-title-redesign">My Card</h3>
        <span className="badge-redesign badge-profit">ACTIVE</span>
      </div>
      <div className="card-body-redesign">
        <div className="stat-label-redesign">Total</div>
        <div className="stat-value-redesign stat-value-pos font-mono">
          €1,234.56
        </div>
      </div>
    </div>
  );
};
```

---

**Versione**: 1.0.0  
**Ultimo aggiornamento**: 2026-02-17  
**Autore**: Masaniello Dashboard Team
