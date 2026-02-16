# MasaWeb - Sistema di Money Management Masaniello

## 📋 Indice

1. [Introduzione](#introduzione)
2. [L'Algoritmo Masaniello](#lalgoritmo-masaniello)
3. [Architettura dell'Applicazione](#architettura-dellapplicazione)
4. [Funzionalità Principali](#funzionalità-principali)
5. [Regole di Gestione](#regole-di-gestione)
6. [Sistema di Banking](#sistema-di-banking)
7. [Interfaccia Utente](#interfaccia-utente)
8. [Configurazione e Setup](#configurazione-e-setup)
9. [Casi d'Uso](#casi-duso)
10. [Tecnologie Utilizzate](#tecnologie-utilizzate)

---

## 🎯 Introduzione

**MasaWeb** è un'applicazione web avanzata per la gestione del bankroll basata sull'**algoritmo Masaniello**, un sistema matematico di money management sviluppato per ottimizzare le scommesse sportive e il trading.

L'applicazione permette di:
- Pianificare cicli di scommesse con capitale controllato
- Calcolare automaticamente gli stake ottimali per ogni evento
- Gestire il rischio attraverso regole personalizzabili
- Accantonare profitti in modo strategico
- Monitorare performance e statistiche in tempo reale

---

## 🧮 L'Algoritmo Masaniello

### Principio Fondamentale

Il **Masaniello** è un sistema di gestione progressiva del capitale che calcola lo stake ottimale per ogni scommessa in base a:

1. **Capitale Disponibile**: La cassa attuale del piano
2. **Eventi Totali**: Numero di scommesse da piazzare
3. **Vittorie Attese**: Numero di vincite necessarie per raggiungere l'obiettivo
4. **Quota Media**: Moltiplicatore di vincita previsto
5. **Capitale Obiettivo**: Target di profitto da raggiungere

### Formula di Calcolo dello Stake

```
Stake = (Target - Capitale) / [(Quota - 1) × VittorieRimanenti + EventiRimanenti - VittorieRimanenti]
```

Dove:
- **Target**: Capitale obiettivo finale del piano
- **Capitale**: Capitale corrente disponibile
- **Quota**: Quota media delle scommesse
- **VittorieRimanenti**: Numero di vincite ancora necessarie
- **EventiRimanenti**: Numero di eventi ancora da giocare

### Caratteristiche Chiave

#### 1. **Progressione Dinamica**
Lo stake si adatta automaticamente dopo ogni evento:
- **Dopo una vittoria**: Lo stake diminuisce (hai meno strada da fare)
- **Dopo una perdita**: Lo stake aumenta (devi recuperare)

#### 2. **Gestione del Rischio**
- **Max Consecutive Losses**: Limita lo stake quando si accumulano perdite consecutive
- **Rescue Mode**: Modalità di recupero quando il capitale scende sotto lo start
- **Stop Loss**: Chiusura automatica se il drawdown supera una soglia

#### 3. **Interesse Composto**
Il capitale finale di un ciclo diventa il capitale iniziale del successivo, permettendo una crescita esponenziale controllata.

---

## 🏗️ Architettura dell'Applicazione

### Struttura dei Componenti

```
src/
├── components/
│   ├── ActivePlan.tsx          # Pannello piano attivo con controlli
│   ├── AnalyticsSection.tsx    # Grafici e visualizzazioni
│   ├── ConfigurationPanel.tsx  # Configurazione parametri
│   ├── DebugRules.tsx          # Pannello debug regole
│   ├── Header.tsx              # Intestazione app
│   ├── HistoryLog.tsx          # Storico piani completati
│   ├── StatsOverview.tsx       # Statistiche generali
│   └── TradingJournal.tsx      # Diario trading e performance
├── hooks/
│   └── useMasaniello.ts        # Hook principale logica Masaniello
├── types/
│   └── masaniello.ts           # Definizioni TypeScript
├── utils/
│   ├── masaLogic.ts            # Logica calcolo Masaniello
│   ├── mathUtils.ts            # Utility matematiche
│   └── performanceUtils.ts     # Calcoli performance
└── App.tsx                      # Componente principale
```

### Flusso dei Dati

```
User Input → useMasaniello Hook → State Management → UI Components
                ↓
         masaLogic.ts (Calcoli)
                ↓
         LocalStorage (Persistenza)
```

---

## ⚙️ Funzionalità Principali

### 1. **Gestione Piani Masaniello**

#### Creazione Piano
- **Capitale Iniziale**: Importo di partenza (es. 1000€)
- **Quota Media**: Quota prevista per le scommesse (es. 1.90)
- **Eventi Totali**: Numero di scommesse da piazzare (es. 10)
- **Vittorie Attese**: Numero di vincite necessarie (es. 7)

#### Calcolo Automatico
- **Stake Suggerito**: Calcolato in tempo reale per ogni evento
- **Capitale Obiettivo**: Target di profitto del piano
- **Max Net Profit**: Massimo profitto teorico raggiungibile

### 2. **Registrazione Eventi**

#### Tipi di Evento
1. **Vittoria Completa**: Scommessa vinta con stake pieno
2. **Perdita Completa**: Scommessa persa
3. **Vittoria Parziale (Tesoretto)**: Vincita con stake ridotto (50%)
4. **Perdita Parziale**: Perdita con stake ridotto (50%)
5. **Break Even**: Rimborso quota 1.00
6. **Aggiustamento Manuale**: Modifica capitale senza consumare eventi

#### Sequenze Parziali
Il sistema supporta **sequenze di eventi parziali** che si sommano:
- Esempio: 2 vincite parziali (50% + 50%) = 1 vittoria completa
- Utile per strategie di copertura o hedging

### 3. **Modalità Rescue**

Quando il capitale scende sotto il livello iniziale, si attiva la **Rescue Mode**:

- **Obiettivo**: Recuperare almeno il 90% del capitale iniziale
- **Stake Modificato**: Calcolo conservativo per minimizzare ulteriori perdite
- **Indicatore Visivo**: Badge arancione "RESCUE MODE"
- **Uscita**: Quando si raggiunge il 90% del capitale iniziale

### 4. **Sistema di Generazioni**

I piani sono organizzati in **generazioni** (cicli):

```
Gen. 1 → Chiusura (Banking) → Gen. 2 → Chiusura → Gen. 3 → ...
```

Ogni generazione:
- Ha un ID univoco
- Mantiene riferimenti a padre/figli (tree structure)
- Conserva snapshot della configurazione al momento della creazione
- Traccia la regola che ha causato la chiusura

---

## 📜 Regole di Gestione

### Regole di Chiusura Piano

#### 1. **Vittoria Iniziale** (`first_win`)
- **Trigger**: Prima vittoria (completa o somma parziali) senza perdite
- **Azione**: Chiude il piano immediatamente
- **Uso**: Strategia ultra-conservativa, blocca profitto subito

#### 2. **Ritorno in Positivo** (`back_positive`)
- **Trigger**: Capitale torna sopra il livello iniziale dopo essere stato negativo
- **Azione**: Chiude il piano
- **Uso**: Protezione del capitale, evita di restare in perdita

#### 3. **90% Profitto Raggiunto** (`profit_90`)
- **Trigger**: Profitto raggiunge il 90% del massimo teorico
- **Azione**: Chiude il piano
- **Uso**: Blocca profitto vicino all'obiettivo senza rischiare

#### 4. **Tutte Vittorie Completate** (`all_wins`)
- **Trigger**: Numero di vittorie richieste raggiunto
- **Azione**: Chiude il piano
- **Uso**: Completamento naturale del Masaniello

#### 5. **Vittorie Impossibili** (`impossible`)
- **Trigger**: Eventi rimanenti < Vittorie rimanenti
- **Azione**: Dichiara fallimento del piano
- **Uso**: Rilevamento automatico di situazioni irrecuperabili

#### 6. **Chiusura Protettiva** (`smart_auto_close`)
- **Trigger**: >65% eventi consumati E >90% capitale obiettivo raggiunto
- **Azione**: Chiude il piano
- **Uso**: Protezione profitto quando si è vicini all'obiettivo

#### 7. **Stop Loss** (`stop_loss`)
- **Trigger**: Drawdown supera la percentuale configurata (es. 20%)
- **Azione**: Chiude il piano
- **Uso**: Limitazione perdite massime

### Regole di Banking (Accantonamento)

#### 1. **Auto Bank 100% Target Settimanale** (`auto_bank_100`)
- **Trigger**: Capitale raggiunge il target settimanale assoluto
- **Azione**: Accantona la percentuale configurata del profitto
- **Calcolo Target**: `Capitale Iniziale × (1 + % Target Settimanale)`
- **Persistenza**: Il target rimane fisso fino al banking
- **Esempio**: 
  - Capitale iniziale: 1000€
  - Target %: 20%
  - Target assoluto: 1200€
  - Al raggiungimento: accantona e resetta target

#### 2. **Profit Milestone** (`profit_milestone`)
- **Trigger**: Patrimonio totale (capitale + banked) raggiunge multipli del capitale iniziale
- **Milestone**: 2x, 3x, 4x... del capitale iniziale
- **Azione**: Accantona la percentuale configurata
- **High Water Mark**: Memorizza il massimo milestone raggiunto
- **Esempio**:
  - Capitale iniziale: 1000€
  - A 2000€ totali → Milestone 2x → Banking
  - A 3000€ totali → Milestone 3x → Banking

### Priorità delle Regole

Le regole vengono valutate in questo ordine:

1. **Banking Rules** (massima priorità)
   - Auto Bank 100
   - Profit Milestone

2. **Closure Rules**
   - First Win
   - Back Positive
   - Profit 90%
   - All Wins
   - Stop Loss
   - Rescue Target Reached
   - Impossible
   - Smart Auto Close

---

## 💰 Sistema di Banking

### Concetto di Banking

Il **banking** è il processo di accantonamento del profitto in un "salvadanaio" separato dal capitale operativo.

### Meccanismo

```
Capitale Corrente: 1200€
Banking Trigger: Target 1200€ raggiunto
Percentuale Banking: 50%
Profitto da Bancaire: 200€ × 50% = 100€

Risultato:
- Capitale Nuovo Piano: 1100€
- Banked (salvadanaio): +100€
```

### Tipi di Banking

#### 1. **Banking Percentuale**
- Configurabile da 0% a 100%
- Applicato al profitto del ciclo
- Default: valore configurato in settings

#### 2. **Banking Totale (Auto Bank 100)**
- Quando `accumulationPercent = 0` e si raggiunge il target
- Accantona il 100% del profitto
- Resetta il capitale al livello iniziale del ciclo

### Persistenza Target Settimanale

Il sistema mantiene il **target settimanale assoluto** attraverso i cicli:

```
Ciclo 1: Start 1000€ → Target 1200€
  ↓ (chiude per altra regola, es. First Win a 1050€)
Ciclo 2: Start 1050€ → Target 1200€ (EREDITATO)
  ↓ (continua fino a raggiungere 1200€)
Ciclo 3: Start 1200€ → Nuovo Target 1440€
```

### Baseline Settimanale

Il sistema traccia il **capitale di inizio settimana** (`startWeeklyBaseline`) per:
- Calcolare correttamente il progresso verso il target
- Mostrare grafici accurati (0% all'inizio settimana)
- Gestire correttamente l'interesse composto tra cicli

---

## 🎨 Interfaccia Utente

### Dashboard Principale

#### 1. **Stats Overview**
- **Total Worth**: Capitale + Banked
- **Capitale Iniziale**: Riferimento fisso (es. 1000€)
- **Total Profit**: Profitto totale accumulato
- **Total Growth**: Crescita percentuale
- **Total Banked**: Importo accantonato (badge giallo)
- **Wins/Losses**: Contatori vittorie e perdite
- **EV Performance**: Rapporto tra vittorie reali e attese

#### 2. **Storico Capitale (Grafico)**
- Grafico ad area che mostra l'evoluzione del capitale
- Asse X: Giorni stimati (0.4 giorni per evento)
- Asse Y: Capitale in euro
- Tooltip con dettagli per ogni generazione

#### 3. **Target Weekly (Radial Gauge)**
- **Cerchio di Progresso**: Visualizza % completamento target settimanale
- **Calcolo**: `(Capitale Attuale - Baseline) / (Target - Baseline)`
- **Centro**: Percentuale + Euro mancanti
- **Milestone Steps**: Indicatori orizzontali per target completati
- **Colori**:
  - Blu: Progresso attuale
  - Grigio scuro: Non completato
  - Grigio chiaro pulsante: In corso

#### 4. **Active Plan Panel**
- **Intestazione**: Generazione, Capitale, Profitto
- **Badge di Stato**:
  - Verde: In profitto
  - Rosso: In perdita
  - Arancione: Rescue Mode
  - Giallo: Banked disponibile
- **Controlli Evento**: Pulsanti per registrare vittorie/perdite
- **Stake Suggerito**: Calcolato in tempo reale
- **Progress Bar**: Eventi e Vittorie rimanenti
- **Regole Attive**: Toggle per abilitare/disabilitare regole

### Trading Journal

Sezione dedicata all'analisi delle performance:

#### Performance Metrics
- **Win Rate**: Percentuale vittorie
- **Average Stake**: Stake medio per evento
- **ROI**: Return on Investment
- **Sharpe Ratio**: Rapporto rischio/rendimento
- **Max Drawdown**: Massima perdita percentuale
- **Recovery Factor**: Capacità di recupero

#### Event Timeline
- Lista cronologica di tutti gli eventi
- Filtri per tipo, generazione, periodo
- Dettagli completi per ogni evento
- Snapshot della configurazione al momento dell'evento

### Pannello Debug

Accessibile tramite pulsante "🐞 DEBUG" (nascosto di default):

```
DEBUG: Banking Rules

Auto Bank 100 (Weekly)
Active: YES
Start Capital: 1000
Current Capital: 1000
Profit: 0
Target %: 20%
Persisted Target? YES
Target Total: 1250
TRIGGER: FALSE

Active Rules: first_win, back_positive, profit_90, all_wins...
```

---

## 🔧 Configurazione e Setup

### Parametri Configurabili

#### Parametri Base
- **Capitale Iniziale** (`initialCapital`): 100-100000€
- **Quota Media** (`quota`): 1.10-10.00
- **Eventi Totali** (`totalEvents`): 1-50
- **Vittorie Attese** (`expectedWins`): 1-Eventi Totali

#### Parametri Avanzati
- **% Accantonamento** (`accumulationPercent`): 0-100%
- **Target Settimanale %** (`weeklyTargetPercentage`): 1-100%
- **Milestone Banking %** (`milestoneBankPercentage`): 0-100%
- **Stop Loss %** (`stopLossPercentage`): 5-50%
- **Max Perdite Consecutive** (`maxConsecutiveLosses`): 0-10

### Validazioni

- **Vittorie ≤ Eventi**: Non puoi richiedere più vittorie degli eventi disponibili
- **Quota > 1.00**: La quota deve essere maggiore di 1
- **Capitale > 0**: Il capitale deve essere positivo

### Persistenza Dati

Tutti i dati sono salvati in **localStorage**:

```javascript
{
  "masaniello_config": { /* configurazione */ },
  "masaniello_plans": { /* piani attivi e storici */ },
  "masaniello_active_plan_id": "123",
  "masaniello_active_rules": ["first_win", "auto_bank_100", ...]
}
```

---

## 📊 Casi d'Uso

### Caso 1: Trading Conservativo

**Obiettivo**: Crescita lenta e costante con rischio minimo

**Configurazione**:
- Capitale: 1000€
- Quota: 1.50
- Eventi: 20
- Vittorie: 15
- Regole: `first_win`, `auto_bank_100`, `stop_loss`
- Banking: 80%
- Target Settimanale: 10%

**Strategia**:
- Chiude al primo profitto
- Accantona l'80% del guadagno
- Stop loss al 15%

### Caso 2: Trading Aggressivo

**Obiettivo**: Massimizzare profitto con rischio controllato

**Configurazione**:
- Capitale: 5000€
- Quota: 1.90
- Eventi: 10
- Vittorie: 7
- Regole: `profit_90`, `profit_milestone`, `smart_auto_close`
- Banking: 30%
- Target Settimanale: 25%

**Strategia**:
- Lascia correre il piano fino al 90% del target
- Accantona solo il 30% (più capitale per crescita)
- Banking ai multipli del capitale (2x, 3x...)

### Caso 3: Recupero da Perdita

**Scenario**: Capitale sceso a 800€ da 1000€

**Azione Sistema**:
1. Attiva automaticamente **Rescue Mode**
2. Calcola stake conservativo
3. Obiettivo: recuperare a 900€ (90% di 1000€)
4. Regola `rescue_target_reached` chiude al raggiungimento

**Utente**:
- Può continuare con stake suggerito
- Può attivare manualmente rescue con `activateRescueMode()`
- Può chiudere manualmente il piano

---

## 💻 Tecnologie Utilizzate

### Frontend
- **React 18**: Libreria UI
- **TypeScript**: Type safety
- **Vite**: Build tool e dev server
- **TailwindCSS**: Styling (via CDN)
- **Lucide React**: Icone

### Librerie
- **Recharts**: Grafici e visualizzazioni
- **date-fns**: Manipolazione date

### Architettura
- **Custom Hooks**: `useMasaniello` per logica centralizzata
- **LocalStorage**: Persistenza dati lato client
- **Component-based**: Architettura modulare

### Testing
- **Vitest**: Test runner
- **@testing-library/react**: Testing componenti

---

## 🚀 Installazione e Avvio

### Prerequisiti
- Node.js 18+
- npm o yarn

### Setup

```bash
# Clone repository
git clone <repository-url>
cd masaweb-1

# Installa dipendenze
npm install

# Avvia dev server
npm run dev

# Build produzione
npm run build

# Preview build
npm run preview

# Run tests
npm test
```

### Accesso
Apri browser su `http://localhost:5173`

---

## 📈 Formule e Calcoli

### Calcolo Stake Base

```typescript
function calculateStake(
  capital: number,
  eventsLeft: number,
  winsLeft: number,
  quota: number,
  targetCapital: number
): number {
  const numerator = targetCapital - capital;
  const denominator = (quota - 1) * winsLeft + (eventsLeft - winsLeft);
  return numerator / denominator;
}
```

### Calcolo Stake con Max Consecutive Losses

```typescript
if (consecutiveLosses >= maxConsecutiveLosses && maxConsecutiveLosses > 0) {
  const conservativeFactor = 0.5; // Riduce stake del 50%
  stake = baseStake * conservativeFactor;
}
```

### Calcolo Max Net Profit

```typescript
function calculateMaxNetProfit(
  capital: number,
  eventsLeft: number,
  winsLeft: number,
  quota: number
): number {
  let tempCapital = capital;
  for (let i = 0; i < winsLeft; i++) {
    const stake = calculateStake(tempCapital, eventsLeft - i, winsLeft - i, quota, targetCapital);
    tempCapital += stake * (quota - 1);
  }
  return tempCapital - capital;
}
```

### Calcolo EV Performance

```typescript
const expectedWins = events.reduce((acc, e) => acc + (1 / e.quota), 0);
const actualWins = events.filter(e => e.isWin).length;
const evPerformance = actualWins / expectedWins;
```

---

## 🔐 Sicurezza e Limitazioni

### Sicurezza
- Tutti i dati sono salvati localmente (localStorage)
- Nessuna trasmissione di dati sensibili
- No autenticazione richiesta

### Limitazioni
- **Browser-based**: Dati non sincronizzati tra dispositivi
- **Single-user**: Non supporta multi-utente
- **No backup cloud**: Backup manuale tramite export (feature futura)

### Best Practices
- Esporta regolarmente i dati
- Non cancellare localStorage del browser
- Usa sempre quote realistiche
- Testa configurazioni con capitale virtuale

---

## 🎓 Glossario

- **Banking**: Accantonamento profitto in salvadanaio separato
- **Baseline**: Capitale di riferimento per calcoli percentuali
- **Drawdown**: Perdita percentuale dal picco massimo
- **EV (Expected Value)**: Valore atteso matematico
- **Generazione**: Ciclo completo di un piano Masaniello
- **Milestone**: Multiplo del capitale iniziale (2x, 3x, 4x...)
- **Rescue Mode**: Modalità recupero perdite
- **Stake**: Importo da scommettere su un singolo evento
- **Target**: Obiettivo di capitale da raggiungere
- **Tesoretto**: Vincita parziale (50% stake)

---

## 📝 Note Finali

Questa applicazione è uno strumento di **money management** e non garantisce profitti. Il successo dipende da:

1. **Disciplina**: Seguire il piano senza deviazioni emotive
2. **Analisi**: Scegliere eventi con quote realistiche
3. **Gestione Rischio**: Usare regole di protezione appropriate
4. **Capitale Adeguato**: Non rischiare più di quanto ci si può permettere di perdere

**Disclaimer**: Il trading e le scommesse comportano rischi. Usa questo strumento in modo responsabile.

---

## 📞 Supporto e Contributi

Per bug, feature request o contributi, contatta il team di sviluppo.

**Versione**: 1.0.0  
**Ultimo Aggiornamento**: Febbraio 2026
