import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './supabaseClient.js'
const farben = [
  { symbol: '♠', name: 'Pik', rot: false },
  { symbol: '♥', name: 'Herz', rot: true },
  { symbol: '♦', name: 'Karo', rot: true },
  { symbol: '♣', name: 'Kreuz', rot: false },
]

const werte = [
  { name: '2', rang: 2 },
  { name: '3', rang: 3 },
  { name: '4', rang: 4 },
  { name: '5', rang: 5 },
  { name: '6', rang: 6 },
  { name: '7', rang: 7 },
  { name: '8', rang: 8 },
  { name: '9', rang: 9 },
  { name: '10', rang: 10 },
  { name: 'B', rang: 11 },
  { name: 'D', rang: 12 },
  { name: 'K', rang: 13 },
  { name: 'A', rang: 14 },
]


function neuesDeck() {
  return farben.flatMap((farbe) =>
    werte.map((wert) => ({
      ...wert,
      symbol: farbe.symbol,
      farbe: farbe.name,
      rot: farbe.rot,
      id: `${farbe.name}-${wert.name}`,
    })),
  )
}
function mischen(karten) {
  const deck = [...karten]

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }

  return deck
}

function sortiereHand(hand) {
  return [...hand].sort(
    (a, b) =>
      b.rang - a.rang ||
      farben.findIndex((f) => f.name === a.farbe) -
        farben.findIndex((f) => f.name === b.farbe),
  )
}

function findeVierlinge(hand) {
  const gruppen = {}

  hand.forEach((karte) => {
    gruppen[karte.rang] = (gruppen[karte.rang] || 0) + 1
  })

  return Object.entries(gruppen)
    .filter(([, anzahl]) => anzahl === 4)
    .map(([rang]) => Number(rang))
    .sort((a, b) => b - a)
}

function istVierling(karten) {
  if (!karten || karten.length !== 4) {
    return false
  }

  const rang = karten[0]?.rang

  return (
    rang !== undefined &&
    karten.every((karte) => karte.rang === rang)
  )
}

function bewertePack(karten) {
  if (!karten || (karten.length !== 3 && karten.length !== 4)) {
    return { rang: 0, kartenwerte: [], name: 'Unvollständig' }
  }

  const werte = karten
    .map((karte) => Number(karte.rang))
    .sort((a, b) => b - a)

  const zaehler = {}
  karten.forEach((karte) => {
    zaehler[karte.rang] = (zaehler[karte.rang] || 0) + 1
  })

  const gruppen = Object.entries(zaehler)
    .map(([rang, anzahl]) => ({ rang: Number(rang), anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl || b.rang - a.rang)

  const gleicheFarbe = karten.every(
    (karte) => karte.farbe === karten[0].farbe,
  )

  // Vierling
  if (karten.length === 4 && gruppen[0].anzahl === 4) {
    return {
      rang: 7,
      kartenwerte: [gruppen[0].rang],
      name: 'Vierling',
    }
  }

  if (karten.length !== 3) {
    return { rang: 0, kartenwerte: [], name: 'Unvollständig' }
  }

  const [a, b, c] = werte

  const strasse =
    (a - b === 1 && b - c === 1) ||
    (a === 14 && b === 3 && c === 2)

  // 2. Drilling
  if (gruppen[0].anzahl === 3) {
    return {
      rang: 6,
      kartenwerte: [gruppen[0].rang],
      name: 'Drilling',
    }
  }

  // 3. Straße gleicher Farbe
  if (gleicheFarbe && strasse) {
    return {
      rang: 5,
      kartenwerte: werte,
      name: 'Straße gleicher Farbe',
    }
  }

  // 4. Straße unterschiedlicher Farbe
  if (strasse) {
    return {
      rang: 4,
      kartenwerte: werte,
      name: 'Straße unterschiedlicher Farbe',
    }
  }

  // 5. Falush: gleiche Farbe, aber keine Straße
  if (gleicheFarbe) {
    return {
      rang: 3,
      kartenwerte: werte,
      name: 'Falush',
    }
  }

  // 6. Paar
  if (gruppen[0].anzahl === 2) {
    return {
      rang: 2,
      kartenwerte: [
        gruppen[0].rang,
        ...gruppen
          .filter((gruppe) => gruppe.anzahl === 1)
          .map((gruppe) => gruppe.rang),
      ],
      name: 'Paar',
    }
  }

  // 7. Einzelne Karten
  return {
    rang: 1,
    kartenwerte: werte,
    name: 'Einzelne Karte',
  }
}

function vergleichePacks(packA, packB) {
  const a = bewertePack(packA)
  const b = bewertePack(packB)

  if (a.rang !== b.rang) {
    return a.rang > b.rang ? 1 : -1
  }

  const laenge = Math.max(
    a.kartenwerte.length,
    b.kartenwerte.length,
  )

  for (let i = 0; i < laenge; i++) {
    const wertA = a.kartenwerte[i] || 0
    const wertB = b.kartenwerte[i] || 0

    if (wertA !== wertB) {
      return wertA > wertB ? 1 : -1
    }
  }

  return 0
}

function Spielkarte({
  karte,
  verdeckt = false,
  onClick,
  draggable = false,
  ausgewaehlt = false,
  onDragStart,
  onDragEnd,
}) {
  if (verdeckt) {
    return (
      <div className="spielkarte rueckseite" aria-label="Verdeckte Karte">
        <div className="kartenmuster">
          <span>✦</span>
          <span>✦</span>
          <span>✦</span>
        </div>
      </div>
    )
  }

  if (!karte) return null

  return (
    <button
      type="button"
      draggable={draggable}
      className={`spielkarte vorderseite ${
        karte.rot ? 'rot' : 'schwarz'
      } ${ausgewaehlt ? 'karte-ausgewaehlt' : ''} ${
        draggable ? 'ziehbare-karte' : ''
      }`}
      aria-label={`${karte.name} ${karte.farbe}`}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="karten-ecke oben-links">
        <strong>{karte.name}</strong>
        <span>{karte.symbol}</span>
      </div>

      <div className="kartenzeichen">{karte.symbol}</div>

      <div className="karten-ecke unten-rechts">
        <strong>{karte.name}</strong>
        <span>{karte.symbol}</span>
      </div>
    </button>
  )
}

function Spielpack({ karten = [], verdeckt = false }) {
  return (
    <div className={`karten ${
  !verdeckt &&
  karten.length === 4 &&
  karten.every((karte) => karte.rang === karten[0].rang)
    ? 'vierling-leuchtet'
    : ''
}`}>
      {karten.map((karte) => (
        <Spielkarte
          key={karte.id}
          karte={karte}
          verdeckt={verdeckt}
        />
      ))}
    </div>
  )
}

export default function App() {
  
  const [spielerNamen, setSpielerNamen] = useState([
  'Rechter Spieler',
  'Mittlerer Spieler',
  'Linker Spieler',
  'Du',
])
  const [phase, setPhase] = useState('bereit')
  const [ziehungen, setZiehungen] = useState([])
  const [kartengeber, setKartengeber] = useState(null)
  const [haende, setHaende] = useState([[], [], [], []])
  const [restDeck, setRestDeck] = useState([])
  const [ausgeteilteKarten, setAusgeteilteKarten] = useState(0)
const [gleichstandSpieler, setGleichstandSpieler] = useState([])
  const [meldung, setMeldung] = useState('')
  const [ablegeKarte, setAblegeKarte] = useState(null)
  const [abgelegteRestkarten, setAbgelegteRestkarten] = useState([])
  const [sortierteHand, setSortierteHand] = useState([])
  const [packs, setPacks] = useState([[], [], [], []])


  const [runde, setRunde] = useState(0)
  const [aufdeckReihenfolge, setAufdeckReihenfolge] = useState([])
  const [aufdeckPosition, setAufdeckPosition] = useState(0)
  const [rundeErgebnisse, setRundeErgebnisse] = useState([])
  const [aktuelleAufdeckungen, setAktuelleAufdeckungen] = useState([])

  const [vierlingGewinner, setVierlingGewinner] = useState(null)
  const [vierlingRang, setVierlingRang] = useState(null)

  const [topf, setTopf] = useState(0)
 const [einsatz, setEinsatz] = useState(
  Number(localStorage.getItem('charwali-einsatz')) || 0
)
 const [einsatzBestaetigt, setEinsatzBestaetigt] = useState([
  false,
  false,
  false,
  false,
])
const [tischGewählt, setTischGewählt] = useState(
false
)
useEffect(() => {
  localStorage.setItem('charwali-tisch', String(tischGewählt))
}, [tischGewählt])
 const [einsatzGebucht, setEinsatzGebucht] = useState(false)
  const [gewinne, setGewinne] = useState([0, 0, 0, 0])
 const [token, setToken] = useState([100, 100, 100, 100])
  const [gezogeneKarteId, setGezogeneKarteId] = useState(null)
const [email, setEmail] = useState('')
const [passwort, setPasswort] = useState('')
const [anmeldeName, setAnmeldeName] = useState('')
const [benutzer, setBenutzer] = useState(null)
useEffect(() => {
  if (!benutzer) return

  const name =
    benutzer.user_metadata?.spieler_name ||
    benutzer.email?.split('@')[0] ||
    'Du'

  setSpielerNamen((alt) => [
    alt[0],
    alt[1],
    alt[2],
    name,
  ])
}, [benutzer])
const [authMeldung, setAuthMeldung] = useState('')
const [authLaden, setAuthLaden] = useState(false)
const [spielstandGeladen, setSpielstandGeladen] = useState(false)
useEffect(() => {
  localStorage.setItem('charwali-token', JSON.stringify(token))
}, [token])
useEffect(() => {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      setAuthMeldung(error.message)
      return
    }

    const user = data.session?.user ?? null
    setBenutzer(user)

    if (user) {
      ladeSpielstand(user)
    }
  })

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null
    setBenutzer(user)

    if (user) {
      ladeSpielstand(user)
    }
  })

  return () => subscription.unsubscribe()
}, [])
const registrieren = async () => {
  setAuthLaden(true)
  setAuthMeldung('')

  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password: passwort,
    options: {
      data: {
        spieler_name: anmeldeName.trim(),
      },
    },
  })

  setAuthLaden(false)

  if (error) {
    setAuthMeldung(error.message)
  } else {
    setAuthMeldung('Registrierung erfolgreich. Bitte prüfe deine E-Mail.')
  }
}

const anmelden = async () => {
  setAuthLaden(true)
  setAuthMeldung('')

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: passwort,
  })

  setAuthLaden(false)

  if (error) {
    setAuthMeldung(error.message)
  }
}

const ladeSpielstand = async (user) => {
  if (!user) return

  setSpielstandGeladen(false)

  const { data, error } = await supabase
    .from('spielstaende')
    .select('spielstand')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    setAuthMeldung(error.message)
    return
  }

  if (data?.spielstand?.token !== undefined) {
    setToken((alt) => {
      const neu = [...alt]
      neu[3] = data.spielstand.token
      return neu
    })
  } else {
    setToken((alt) => {
      const neu = [...alt]
      neu[3] = 100
      return neu
    })
  }
  setSpielstandGeladen(true)
}

const abmelden = async () => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    setAuthMeldung(error.message)
  }
}

useEffect(() => {
console.log('TEST:', benutzer, spielstandGeladen)
  if (!benutzer || !spielstandGeladen) return

  const speichern = async () => {
    const { error } = await supabase
      .from('spielstaende')
      .upsert(
        {
          id: benutzer.id,
          spieler_name:
            benutzer.user_metadata?.spieler_name ||
            benutzer.email ||
            'Spieler',
          spielstand: {
            token: token[3],
          },
          aktualisiert_am: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )

    if (error) {
      setAuthMeldung(error.message)
    }
  }

  speichern()
}, [benutzer, spielstandGeladen, token])
  

// Karten nacheinander an alle vier Spieler austeilen.
  useEffect(() => {
    if (
      phase !== 'verteilen' ||
      restDeck.length !== 52 ||
      ausgeteilteKarten >= 52
    ) {
      return
    }

    const timer = setTimeout(() => {
      const kartengeberIndex = spielerNamen.indexOf(kartengeber)
      const startIndex = (kartengeberIndex + 1) % 4
      const spielerIndex = (startIndex + ausgeteilteKarten) % 4
      const karte = restDeck[ausgeteilteKarten]
      const neueAnzahl = ausgeteilteKarten + 1

      setHaende((vorherige) =>
        vorherige.map((hand, index) =>
          index === spielerIndex ? [...hand, karte] : hand,
        ),
      )

      setAusgeteilteKarten(neueAnzahl)

      if (neueAnzahl === 52) {
        setPhase('sortieren')
        setMeldung(
          'Alle 52 Karten wurden ausgeteilt. Deine Karten werden vorbereitet.',
        )
      } else {
        setMeldung(
          `Karte ${neueAnzahl} von 52: ${spielerNamen[spielerIndex]} erhält eine Karte.`,
        )
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [phase, restDeck, ausgeteilteKarten, kartengeber])
useEffect(() => {
  const spielLaeuft = ![
    'bereit',
    'fertig',
    'vierling',
    'beendet',
  ].includes(phase)

  if (!spielLaeuft) return

  const warnung = (event) => {
    event.preventDefault()
    event.returnValue = ''
  }

  window.addEventListener('beforeunload', warnung)

  return () => {
    window.removeEventListener('beforeunload', warnung)
  }
}, [phase])
  // Sobald deine 13. Karte in der Hand angekommen ist, beginnt die Sortierung.
  useEffect(() => {
    if (phase !== 'sortieren' || haende[3].length !== 13) {
      return
    }

    setSortierteHand(sortiereHand(haende[3]))
    setPhase('packs')
    setMeldung(
      'Sortiere deine Karten. Pack 1 darf 3 oder 4 Karten enthalten. Die übrigen Packs enthalten jeweils 3 Karten.',
    )
  }, [phase, haende])

  function kartenZiehen() {
    console.log('Token:', token, 'Einsatz:', einsatz, 'Gebucht:', einsatzGebucht)
  // Einsatz nur beim ersten Ziehen abbuchen.
  if (token.some((stand) => stand < einsatz)) {
  setMeldung('Spiel nicht möglich: Ein Spieler hat zu wenig Token!')
  return
}

if (!einsatzGebucht) {
    if (token.some((stand) => stand < einsatz)) {
  setMeldung('Mindestens ein Spieler hat nicht genügend Token für diesen Tisch.')
  return
}
    setToken((bisherigeToken) =>
      bisherigeToken.map((stand) => stand - einsatz),
    )
    setEinsatzGebucht(true)
    setTopf(einsatz * 4)
  }

  // Beim ersten Ziehen spielen alle vier mit.
  // Bei Gleichstand ziehen nur die betroffenen Spieler erneut.
  const spielerZumZiehen =
    gleichstandSpieler.length > 0
      ? gleichstandSpieler
      : spielerNamen

  const gezogeneKarten = mischen(neuesDeck()).slice(
    0,
    spielerZumZiehen.length,
  )

  const farbenReihenfolge = ['Pik', 'Herz', 'Karo', 'Kreuz']

  const ziehungenMitSpieler = gezogeneKarten
    .map((karte, index) => ({
      spieler: spielerZumZiehen[index],
      karte,
    }))
    .sort(
      (a, b) =>
        farbenReihenfolge.indexOf(a.karte.farbe) -
        farbenReihenfolge.indexOf(b.karte.farbe),
    )

  const hoechsterRang = Math.max(
    ...ziehungenMitSpieler.map((eintrag) => eintrag.karte.rang),
  )

  const spielerMitHoechsterKarte = ziehungenMitSpieler.filter(
    (eintrag) => eintrag.karte.rang === hoechsterRang,
  )

  setZiehungen(ziehungenMitSpieler)
console.log('Gezogene Karten:', ziehungenMitSpieler)
  // Wenn mehrere Spieler die höchste Karte haben:
  if (spielerMitHoechsterKarte.length > 1) {
    const namen = spielerMitHoechsterKarte.map(
      (eintrag) => eintrag.spieler,
    )

    setGleichstandSpieler(namen)
    setPhase('bereit')
    setMeldung(
      'Gleichstand! Nur ' +
        namen.join(' und ') +
        ' ziehen erneut.',
    )
    return
  }

  // Es gibt einen eindeutigen Gewinner.
  const gewinner = spielerMitHoechsterKarte[0].spieler

  setGleichstandSpieler([])
  setKartengeber(gewinner)
  setHaende([[], [], [], []])
  setRestDeck([])
  setAusgeteilteKarten(0)
  setPhase('neuerGeber')
  setMeldung(gewinner + ' hat die höchste Karte gezogen und ist Kartengeber.')
}

 function weiterSpielen() {
  const gewinnerIndex = rundeErgebnisse[3]?.gewinner
if (gewinnerIndex !== undefined) {
  setKartengeber(spielerNamen[gewinnerIndex])
}
  setZiehungen([])
  setHaende([[], [], [], []])
  setRestDeck([])
  setAusgeteilteKarten(0)
  setPacks([[], [], [], []])
  setRunde(0)
  setRundeErgebnisse([])
  setAktuelleAufdeckungen([])
  setVierlingGewinner(null)
  setVierlingRang(null)
  setAufdeckReihenfolge([])
  setAufdeckPosition(0)
 
  setSortierteHand([])
  setAblegeKarte(null)
  setGezogeneKarteId(null)

  setTopf(einsatz * 4)
setEinsatzGebucht(true)
  setEinsatzBestaetigt([false, false, false, false])

  setPhase('neuerGeber')
  setMeldung(
  'Kartengeber: ' + spielerNamen[gewinnerIndex] + '. Er kann jetzt die Karten verteilen.',
)
}

function spielBeenden() {
  setPhase('beendet')
  setMeldung('Der Spieltisch wurde geschlossen. Das Guthaben der Spieler bleibt erhalten.')
}
function neuesSpiel() {
  setZiehungen([])

  setHaende([[], [], [], []])
  setRestDeck([])
  setAusgeteilteKarten(0)
  setMeldung('Bereit? Ziehe zuerst vier Karten, um den Kartengeber zu bestimmen.')
  setAblegeKarte(null)
  setSortierteHand([])
  setPacks([[], [], [], []])
  setRunde(0)
  setRundeErgebnisse([])
  setTopf(0)
  setEinsatz(0)
  setGewinne([0, 0, 0, 0])
  
  setGezogeneKarteId(null)
  setVierlingGewinner(null)
  setVierlingRang(null)
  setAufdeckReihenfolge([])
  setAufdeckPosition(0)
  setAktuelleAufdeckungen([])
  setEinsatzGebucht(false)
setEinsatzBestaetigt([false, false, false, false])
  setPhase('bereit')
  setTischGewählt(false)
  

}
  function kartenVerteilen() {
    if (phase !== 'gezogen' && phase !== 'neuerGeber') return

    const deck = mischen(neuesDeck())

setRestDeck(deck)
    setHaende([[], [], [], []])
    setAusgeteilteKarten(0)
    setAblegeKarte(null)
    setSortierteHand([])
    setPacks([[], [], [], []])
    setRunde(0)
    setAufdeckReihenfolge([])
    setAufdeckPosition(0)
    setRundeErgebnisse([])
    setAktuelleAufdeckungen([])
    setVierlingGewinner(null)
    setVierlingRang(null)
    
    

setGewinne([0, 0, 0, 0])
    setGezogeneKarteId(null)
    setPhase('verteilen')
    setMeldung('Die Karten werden einzeln ausgeteilt …')
  }

  // Karte aus der Hand in eines der vier Packs legen.
 function kartePackHinzufuegen(karte, packIndex) {
  if (phase !== 'packs') return
  if (packIndex < 0 || packIndex > 3) return

  if (!sortierteHand.some((k) => k.id === karte.id)) return

  // Pack 1 darf vier Karten enthalten, Pack 2–4 jeweils drei.
  const maximaleKartenanzahl = packIndex === 0 ? 4 : 3

  if (packs[packIndex].length >= maximaleKartenanzahl) {
    setMeldung('Dieses Pack ist bereits voll.')
    return
  }

  // Die vierte Karte in Pack 1 muss den gleichen Rang haben.
  if (
    packIndex === 0 &&
    packs[0].length === 3 &&
    !packs[0].every((k) => k.rang === karte.rang)
  ) {
    setMeldung('Die vierte Karte in Pack 1 muss den gleichen Rang haben.')
    return
  }

  const neuePacks = packs.map((pack, index) =>
    index === packIndex ? [...pack, karte] : pack,
  )

  const neueHand = sortiereHand(
    sortierteHand.filter((k) => k.id !== karte.id),
  )

  setPacks(neuePacks)
  setSortierteHand(neueHand)
  setGezogeneKarteId(null)
  setAblegeKarte(null)

  setMeldung(
    'Karte in Pack ' +
      (packIndex + 1) +
      ' gelegt. Noch ' +
      neueHand.length +
      ' Karten in deiner Hand.',
  )
}
  function entferneAusPack(karte, packIndex) {
    if (phase !== 'packs') return

    const neuePacks = packs.map((pack, index) =>
      index === packIndex
        ? pack.filter((k) => k.id !== karte.id)
        : pack,
    )

    setPacks(neuePacks)
    setSortierteHand((alt) => sortiereHand([...alt, karte]))
    setAblegeKarte(null)
    setMeldung(
      'Karte zurückgenommen. Du kannst sie in ein anderes Pack legen.',
    )
  }

  function handleDragStart(karte, quelle) {
    setGezogeneKarteId(karte.id)

    setMeldung(
      quelle === 'hand'
        ? `Du ziehst Karte ${karte.name}${karte.symbol}. Lege sie in ein Pack.`
        : `Du ziehst Karte ${karte.name}${karte.symbol} aus einem Pack.`,
    )
  }

  function handleDropInPack(event, packIndex) {
  event.preventDefault()

  const id =
    event.dataTransfer.getData('text/plain') || gezogeneKarteId

  if (!id) return

  const karteAusHand = sortierteHand.find((k) => k.id === id)

  if (karteAusHand) {
    kartePackHinzufuegen(karteAusHand, packIndex)
    return
  }

  if (packIndex === 4) {
    setMeldung('Bitte lege Karten aus deiner Hand in den Vierling.')
    return
  }

  const alterPackIndex = packs.findIndex((pack) =>
    pack.some((k) => k.id === id),
  )

  if (alterPackIndex < 0 || alterPackIndex === packIndex) return

  const maximaleKartenanzahl = packIndex === 0 ? 4 : 3

  if (packs[packIndex].length >= maximaleKartenanzahl) {
    setMeldung('Dieses Pack ist bereits voll.')
    return
  }

  const karte = packs[alterPackIndex].find((k) => k.id === id)
if (
  packIndex === 0 &&
  packs[0].length === 3 &&
  !packs[0].every((k) => k.rang === karte.rang)
) {
  setMeldung('Die vierte Karte in Pack 1 muss den gleichen Rang haben.')
  return
}
  const neuePacks = packs.map((pack, index) => {
    if (index === alterPackIndex) {
      return pack.filter((k) => k.id !== id)
    }
    if (index === packIndex) {
      return [...pack, karte]
    }
    return pack
  })

  setPacks(neuePacks)
  setAblegeKarte(null)
  setGezogeneKarteId(null)
  setMeldung('Karte verschoben.')
}
  function handleDropZurHand(event) {
    event.preventDefault()

    const id =
      event.dataTransfer.getData('text/plain') || gezogeneKarteId

    if (!id) return

    const packIndex = packs.findIndex((pack) =>
      pack.some((k) => k.id === id),
    )

    if (packIndex < 0) return

    const karte = packs[packIndex].find((k) => k.id === id)

    entferneAusPack(karte, packIndex)
    setGezogeneKarteId(null)
  }

  // Pack 1 mit vier Karten bedeutet: alle 13 Karten sind einsortiert.
  // Pack 1 mit drei Karten bedeutet: eine Karte muss abgelegt werden.
  function karteAblegen() {
  if (phase !== 'packs') return

  const vierlingVorhanden =
  packs[0].length === 4 && istVierling(packs[0])
const packsVoll =
  (packs[0].length === 3 || vierlingVorhanden) &&
  packs[1].length === 3 &&
  packs[2].length === 3 &&
  packs[3].length === 3

const reihenfolgeFalsch =
  packsVoll &&
  [0, 1, 2].some(
    (i) => vergleichePacks(packs[i], packs[i + 1]) < 0,
  )

if (reihenfolgeFalsch) {
  setMeldung('Falsche Reihenfolge! Bitte zuerst die Packs korrigieren.')
  return
}
  if (vierlingVorhanden) {
    if (sortierteHand.length === 0) {
      setMeldung('Es sind keine Restkarten zum Ablegen vorhanden.')
      return
    }

    setAbgelegteRestkarten([...sortierteHand])
    setSortierteHand([])
    setAblegeKarte(null)

    setMeldung('Alle Restkarten wurden abgelegt. Du kannst jetzt die Runden starten.')
    return
  }

  const normalePacksVoll = packs.every(
    (pack) => pack.length === 3,
  )

  if (!normalePacksVoll || sortierteHand.length !== 1) {
    setMeldung('Zum Ablegen müssen alle vier Packs vollständig sein und eine Karte übrig bleiben.')
    return
  }

  setAblegeKarte(sortierteHand[0])
  setSortierteHand([])
  setMeldung('Die letzte Karte wurde abgelegt. Du kannst jetzt die Runden starten.')
}
  // Computer sortieren ihre Karten automatisch.
  // Hat ein Computer einen Vierling, kommt dieser in Pack 1.

function baueComputerPacks(hand) {
  let uebrigeKarten = sortiereHand(hand)
  let vierling = null

  // Pack 0: Einen Vierling zuerst separat herausnehmen.
  const vierlinge = findeVierlinge(uebrigeKarten)

  if (vierlinge.length > 0) {
    const vierlingRang = vierlinge[0]

    vierling = uebrigeKarten.filter(
      (karte) => karte.rang === vierlingRang,
    )

    uebrigeKarten = uebrigeKarten.filter(
      (karte) => karte.rang !== vierlingRang,
    )
  }

  // Die normalen Packs werden von der stärksten
  // noch möglichen Kombination an gebildet.
 const computerPacks = [[], [], [], []]

// Ein vorhandener Vierling wird als erstes Pack gespeichert.
if (vierling) {
  computerPacks[0] = vierling
}

// Die übrigen Karten werden auf die freien Packs verteilt.
for (
  let packIndex = vierling ? 1 : 0;
  packIndex < 4 && uebrigeKarten.length >= 3;
  packIndex++
) {
    let besterPack = null

    // Alle möglichen Dreierkombinationen durchsuchen.
    for (let i = 0; i < uebrigeKarten.length - 2; i++) {
      for (let j = i + 1; j < uebrigeKarten.length - 1; j++) {
        for (let k = j + 1; k < uebrigeKarten.length; k++) {
          const kandidat = [
            uebrigeKarten[i],
            uebrigeKarten[j],
            uebrigeKarten[k],
          ]

          if (
            besterPack === null ||
            vergleichePacks(kandidat, besterPack) > 0
          ) {
            besterPack = kandidat
          }
        }
      }
    }

    if (!besterPack) break

    computerPacks[packIndex] = besterPack

    const verwendeteIds = new Set(
      besterPack.map((karte) => karte.id),
    )

    uebrigeKarten = uebrigeKarten.filter(
      (karte) => !verwendeteIds.has(karte.id),
    )
  }

  // Ohne Vierling bleibt eine Karte zum Ablegen übrig.
  // Mit Vierling werden die übrigen neun Karten auf
  // drei normale Packs verteilt.
  const ablegen = vierling ? null : uebrigeKarten[0] || null

  return {
    computerPacks,
    ablegen,
    vierling,
  }
}

        // Runden starten und die Computer-Packs vorbereiten.
  function starteRunden() {
  if (phase !== 'packs') return

  // Vierling muss direkt in Pack 1 liegen.
  const vierlingVorhanden =
    packs[0].length === 4 && istVierling(packs[0])

  // Pack 1: 4 Karten beim Vierling, sonst 3.
  // Pack 2–4: immer jeweils 3 Karten.
const allePacksVoll =
  (packs[0].length === 3 || vierlingVorhanden) &&
  packs[1].length === 3 &&
  packs[2].length === 3 &&
  packs[3].length === 3
  if (!allePacksVoll) {
    setMeldung(
      'Bitte fülle Pack 1 bis 4 vollständig aus.',
    )
    return
  }

  // Ohne Vierling muss eine Restkarte abgelegt werden.
  if (!vierlingVorhanden && !ablegeKarte) {
    setMeldung('Bitte lege die letzte Karte ab.')
    return
  }

  if (sortierteHand.length !== 0) {
    setMeldung('Bitte sortiere zuerst alle Karten ein.')
    return
  }
// Prüfen, ob die Packs von stark nach schwach sortiert sind.
for (let i = 0; i < 3; i++) {
  if (vergleichePacks(packs[i], packs[i + 1]) < 0) {
    setMeldung(
      'Falsche Reihenfolge! Ein stärkeres Pack muss weiter vorne liegen.',
    )
    return
  }
}
  const allePacks = [[], [], [], []]
  const neueVierlinge = [null, null, null, null]

  // Die drei Computer erhalten automatisch ihre Packs.
  for (let i = 0; i < 3; i++) {
    const ergebnis = baueComputerPacks(haende[i])

    allePacks[i] = ergebnis.computerPacks
    neueVierlinge[i] = ergebnis.vierling
  }

  // Deine vier Packs werden übernommen.
  allePacks[3] = packs.map((pack) => [...pack])

  // Dein Vierling liegt bereits in Pack 1.
  neueVierlinge[3] = null

  setPacks(allePacks)
  

  const kartengeberIndex = spielerNamen.indexOf(kartengeber)
  const startIndex = (kartengeberIndex + 1) % 4

  setRunde(0)
  setAufdeckReihenfolge([
    startIndex,
    (startIndex + 1) % 4,
    (startIndex + 2) % 4,
    (startIndex + 3) % 4,
  ])
  setAufdeckPosition(0)
  setRundeErgebnisse([])
  setAktuelleAufdeckungen([])
  setVierlingGewinner(null)
  setVierlingRang(null)
  setPhase('runde')

  setMeldung(
    'Die erste Runde beginnt. ' +
      spielerNamen[startIndex] +
      ' deckt als Erster auf.',
  )
}
  // Das nächste Pack aufdecken.
  function naechsteAufdeckung() {
    if (phase !== 'runde') return

    const spielerIndex = aufdeckReihenfolge[aufdeckPosition]
    if (spielerIndex === undefined) return

    const pack = packs[spielerIndex]?.[runde] || []

    const neueAufdeckungen = [
      ...aktuelleAufdeckungen,
      {
        spielerIndex,
        karten: pack,
        bewertung: bewertePack(pack),
      },
    ]

    setAktuelleAufdeckungen(neueAufdeckungen)

    // Drei Spieler haben noch nicht alle aufgedeckt.
    if (aufdeckPosition < 3) {
      setAufdeckPosition((position) => position + 1)
      setMeldung(
        spielerNamen[spielerIndex] +
          ' hat Pack ' +
          (runde + 1) +
          ' aufgedeckt.',
      )
      return
    }

    // Nach der ersten Runde werden Vierlinge geprüft.
    if (runde === 0) {
  const vierlinge = neueAufdeckungen
    .filter((eintrag) => istVierling(eintrag.karten))
    .map((eintrag) => ({
      spielerIndex: eintrag.spielerIndex,
      karten: eintrag.karten,
    }))

  if (vierlinge.length > 0) {
    let besterVierling = vierlinge[0]

    for (const eintrag of vierlinge.slice(1)) {
      if (
        eintrag.karten[0].rang >
        besterVierling.karten[0].rang
      ) {
        besterVierling = eintrag
      }
    }

    const gewinnerIndex = besterVierling.spielerIndex
    const rang = besterVierling.karten[0].rang

    setVierlingGewinner(spielerNamen[gewinnerIndex])
    setVierlingRang(rang)

    setGewinne((alt) =>
      alt.map((wert, index) =>
        index === gewinnerIndex ? wert + topf : wert,
      ),
    )

    setToken((alt) =>
      alt.map((wert, index) =>
        index === gewinnerIndex ? wert + topf : wert,
      ),
    )

    setTopf(0)
    setPhase('vierling')
    setMeldung(
      spielerNamen[gewinnerIndex] +
        ' gewinnt mit einem Vierling den gesamten Topf!',
    )
    return
  }
}

    // Stärkste Kombination bestimmen.
    // Bei Gleichstand gewinnt der zuletzt Aufdeckende.
    let beste = neueAufdeckungen[0]

    for (const eintrag of neueAufdeckungen.slice(1)) {
      const vergleich = vergleichePacks(
        eintrag.karten,
        beste.karten,
      )

      if (vergleich >= 0) {
        beste = eintrag
      }
    }

    let verlierer = neueAufdeckungen[0]

    for (const eintrag of neueAufdeckungen.slice(1)) {
      const vergleich = vergleichePacks(
        eintrag.karten,
        verlierer.karten,
      )

      if (vergleich <= 0) {
        verlierer = eintrag
      }
    }
setRundeErgebnisse((alt) => [
  ...alt,
  {
    runde: runde + 1,
    gewinner: beste.spielerIndex,
    verlierer: verlierer.spielerIndex,
    packs: neueAufdeckungen,
  },
])
   setGewinne((alt) =>
  alt.map((wert, index) =>
    index === beste.spielerIndex ? wert + 1 : wert,
  ),
)

setToken((alt) =>
  alt.map((wert, index) =>
    index === beste.spielerIndex ? wert + einsatz : wert,
  ),
)

setTopf((alt) => Math.max(0, alt - einsatz))


   // Nach vier Aufdeckungen bleiben alle vier Packs sichtbar.
   // In Runde 1 bis 3 beginnt die nächste Runde erst beim nächsten
   // Klick auf denselben Aufdecken-Button.
   setAufdeckPosition(4)

   if (runde < 3) {
  setPhase('runde')
  setMeldung(
    spielerNamen[beste.spielerIndex] +
      ' gewinnt die ' +
      (runde + 1) +
      '. Runde! Alle vier Packs sind sichtbar. Klicke auf „Nächste Karte aufdecken“, um die nächste Runde zu beginnen.',
  )
} else {
     // Nach der vierten Runde bleiben alle Packs zur Kontrolle sichtbar.
     setPhase('auswertung')
     setMeldung(
       'Alle vier Runden sind beendet. ' +
         spielerNamen[beste.spielerIndex] +
         ' gewinnt die 4. Runde.',
     )
   }
  }



function naechsteRundeStarten() {
  // Darf nach der abgeschlossenen 1., 2. oder 3. Runde starten,
  // wenn alle vier Packs sichtbar sind, oder nach Runde 4 zum Beenden.
  const naechsteRundeErlaubt =
    (phase === 'runde' && aufdeckPosition === 4 && runde < 3) ||
    (phase === 'auswertung' && runde === 3)

  if (!naechsteRundeErlaubt) return

  const letzteAuswertung = rundeErgebnisse[runde]
  if (!letzteAuswertung) return

  const gewinnerIndex = letzteAuswertung.gewinner

  // Nach der vierten Runde beginnt ein neues Spiel.
  if (runde >= 3) {
    const neuerKartengeber = spielerNamen[gewinnerIndex]

    setKartengeber(neuerKartengeber)

    // Rundenergebnisse und Karten zurücksetzen.
    // Die bisherigen Gesamtgewinne bleiben erhalten.
    setRunde(0)
    setRundeErgebnisse([])
    setAktuelleAufdeckungen([])
    setAufdeckPosition(0)
    setAufdeckReihenfolge([])
    setVierlingGewinner(null)
    setVierlingRang(null)

    setZiehungen([])
    setHaende([[], [], [], []])
    setRestDeck([])
    setAusgeteilteKarten(0)
    setPacks([[], [], [], []])
    
    setSortierteHand([])
    setAblegeKarte(null)
    setGezogeneKarteId(null)

        setTopf(0)

    // Der Gewinner der vierten Runde bleibt Kartengeber.
    // Das neue Spiel wird erst durch „Neues Spiel“ gestartet.
    setPhase('fertig')
    setMeldung(
      'Spiel beendet. Neuer Kartengeber: ' +
        neuerKartengeber +
        '. Klicke auf „Neues Spiel“, um weiterzuspielen.',
    )

    return
  }

  // Die nächste Runde beginnt rechts vom Gewinner.
  const naechsteRunde = runde + 1
  const startIndex = (gewinnerIndex + 1) % 4

  setAufdeckReihenfolge([
    startIndex,
    (startIndex + 1) % 4,
    (startIndex + 2) % 4,
    (startIndex + 3) % 4,
  ])

  setRunde(naechsteRunde)
  setAufdeckPosition(0)
  setAktuelleAufdeckungen([])
  setPhase('runde')

    setMeldung(
    (naechsteRunde + 1) +
      '. Runde: ' +
      spielerNamen[startIndex] +
      ' deckt als Erster auf.',
  )
}

  return (
    <main className="charwali">
      <header className="kopf">
        <div className="deko-linie">
          <span>♠</span>
          <span>♥</span>
          <span>♣</span>
          <span>♦</span>
        </div>
        <h1>CHARWALI</h1>
     </header>

{!tischGewählt && (
  <>
    <section className="anmeldung">
      {benutzer ? (
        <>
          <p>Angemeldet: {benutzer.email}</p>
          <button type="button" onClick={abmelden}>Abmelden</button>
        </>
      ) : (
        <>
          <h2>Spieler-Anmeldung</h2>
          <input type="text" placeholder="Spielername"
            value={anmeldeName}
            onChange={(e) => setAnmeldeName(e.target.value)}
          />
          <input type="email" placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input type="password" placeholder="Passwort"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
          />
          <button type="button" onClick={registrieren}>Registrieren</button>
          <button type="button" onClick={anmelden}>Anmelden</button>
          <p>{authMeldung}</p>
        </>
      )}
    </section>

    <section className="spielehalle">
      <h2>CHARWALI SPIELEHALLE</h2>
      {[5, 10, 20, 50, 100].map((wert, index) => (
        <button key={wert} type="button"
          onClick={() => {
  if (token.some((stand) => stand < wert)) {
    setMeldung('Mindestens ein Spieler hat nicht genügend Token.')
    return
  }

  setEinsatz(wert)
  localStorage.setItem('charwali-einsatz', String(wert))

  setToken((alt) => alt.map((stand) => stand - wert))
  setEinsatzGebucht(true)
  setTopf(wert * 4)

  setTischGewählt(true)
  setMeldung(`Tisch ${index + 1} ausgewählt. Einsatz bezahlt.`)
}}>
          Tisch {index + 1} – {wert} Token
        </button>
      ))}
    </section>
  </>
)}
<div className="steuerung">
 
  <div className="aktionsleiste">
<button
  type="button"
  disabled={phase !== 'auswertung' || runde !== 3}
  onClick={weiterSpielen}
>
  Weiter spielen
</button>

  {phase === 'bereit' && (
    <button
      type="button"
      disabled={!tischGewählt || einsatz <= 0}
      onClick={kartenZiehen}
    >
      4 Karten ziehen
    </button>
  )}

  {phase === 'runde' && (
    <button
      type="button"
      className="aufdecken-button"
      onClick={() => {
        if (aufdeckPosition >= 4) {
          naechsteRundeStarten()
        } else {
          naechsteAufdeckung()
        }
      }}
    >
      {aufdeckPosition === 0
        ? 'Erste Karte aufdecken'
        : 'Nächste Karte aufdecken'}
    </button>
  )}

  {(phase === 'fertig' || phase === 'vierling') && (
    <button type="button" onClick={neuesSpiel}>
      Neues Spiel
    </button>
  )}
</div>
</div>
      <section className="statusbereich" aria-live="polite">
        
        <p>{meldung}</p>

        
          
        
        {vierlingRang !== null && phase === 'vierling' && (
          <p>
            <strong>Vierling:</strong> vier {werte.find((wert) => wert.rang === vierlingRang)?.name}
          </p>
        )}

        
      </section>
{(phase === 'gezogen' ||
  phase === 'neuerGeber' ||
  (phase === 'bereit' && gleichstandSpieler.length > 0)) && (
        <section className="ziehbereich">
          <h2>{phase === 'gezogen' ? 'Kartengeber bestimmt' : 'Gezogene Karten'}</h2>
          <p className="erklaerung">
            Die höchste Karte bestimmt den Kartengeber.
          </p>

          <div className="ziehkarten">
            {ziehungen.map((eintrag) => (
              <div className="ziehkarte" key={eintrag.spieler}>
                <Spielkarte karte={eintrag.karte} />
                <strong>{eintrag.spieler}</strong>

                {eintrag.spieler === kartengeber && (
                  <span className="gewinner-markierung">
                    Kartengeber
                  </span>
                )}
              </div>
            ))}
          </div>
                    {(phase === 'gezogen' || phase === 'neuerGeber') && (
            <button type="button" onClick={kartenVerteilen}>
              Karten verteilen
            </button>
          )}
        </section>
      )}
    <section className={`tisch neuer-tisch ${phase === 'packs' ? 'pack-phase' : ''} ${phase === 'verteilen' ? 'verteil-phase' : ''}`}>
        <div className="tisch-mitte">
  <div className="ornament">✦</div>
  <h2>CHARWALI</h2>
{(phase === 'gezogen' || phase === 'neuerGeber') && (
  <div className="kartengeber-anzeige">
    🃏 Kartengeber: <strong>{kartengeber || 'Noch nicht bestimmt'}</strong>
  </div>
)} <div className={`gemeinsamer-topf ${topf > 0 ? 'topf-aktiv' : ''}`}>
  <span>🪙 GEMEINSAMER TOPF</span>
 <strong>{topf} Token</strong>
  
</div>

          <p>
            {phase === 'bereit' && 'Der Spieltisch ist bereit'}
            {phase === 'gezogen' && 'Der Kartengeber steht fest'}
            {phase === 'verteilen' && 'Die Karten werden verteilt'}
            {phase === 'sortieren' && 'Deine Karten werden vorbereitet'}
            {phase === 'packs' && 'Sortiere deine Karten'}
            {phase === 'runde' && `${runde + 1}. Runde`}
            {phase === 'auswertung' && 'Runde ausgewertet'}
            {phase === 'fertig' && 'Spielrunde beendet'}
            {phase === 'vierling' && 'Vierling gewinnt den Topf'}
          </p>

          <div className="kartenfarben">♠ ♥ ♦ ♣</div>
        </div>

        {spielerNamen.map((name, index) => (
          <div
            className={`spieler ${
              index === 0
                ? 'rechts'
                : index === 1
                  ? 'oben'
                  : index === 2
                    ? 'links'
                    : 'unten'
            }`}
            key={name}
          >
   <h3 className={
  (
    (phase === 'gezogen' || phase === 'neuerGeber') &&
    kartengeber === name
  ) ||
  rundeErgebnisse[rundeErgebnisse.length - 1]?.gewinner === index
    ? 'spieler-titel-aktiv'
    : ''
}>
  {(phase === 'gezogen' || phase === 'neuerGeber') &&
    kartengeber === name ? '🃏 ' : ''}
  {rundeErgebnisse[rundeErgebnisse.length - 1]?.gewinner === index
    ? '🏆 '
    : ''}
  {name}
</h3>
            
           
<div className="tokenstand">
  <strong>Token: {token[index]}</strong>
  
</div>
<p className="einsatzanzeige">

</p>
            {phase === 'runde' || phase === 'auswertung' ? (
              aktuelleAufdeckungen.some(
                (eintrag) => eintrag.spielerIndex === index,
              ) ? (
                <Spielpack
                  karten={
                    aktuelleAufdeckungen.find(
                      (eintrag) => eintrag.spielerIndex === index,
                    )?.karten || []
                  }
                />
              ) : (
                <Spielpack
  karten={packs[index]?.[runde] || []}
  verdeckt={
    !aktuelleAufdeckungen.some(
      (eintrag) => eintrag.spielerIndex === index
    )
  }
/>
              )
            ) : phase === 'packs' ? (
              <div
                className={`karten hand-zum-sortieren ${
                  index === 3 ? 'eigene-hand' : ''
                }`}
                onDragOver={
                  index === 3
                    ? (event) => event.preventDefault()
                    : undefined
                }
                onDrop={index === 3 ? handleDropZurHand : undefined}
              >
                {index === 3
                  ? sortierteHand.map((karte) => (
                      <Spielkarte
                        key={karte.id}
                        karte={karte}
                        draggable
                        ausgewaehlt={gezogeneKarteId === karte.id}
                        onClick={() => {
                          // Beim Klicken werden zunächst die ersten drei
                          // Karten pro Pack einsortiert.
                        const pack1IstVierling =
  packs[0].length === 3 &&
  packs[0].every((k) => k.rang === karte.rang)

const ersterFreierPack = pack1IstVierling
  ? 0
  : packs.findIndex((pack) => pack.length < 3)

if (ersterFreierPack >= 0) {
  kartePackHinzufuegen(karte, ersterFreierPack)
}
                        }}
                        onDragStart={(event) => {
                          event.dataTransfer.setData(
                            'text/plain',
                            karte.id,
                          )
                          event.dataTransfer.effectAllowed = 'move'
                          handleDragStart(karte, 'hand')
                        }}
                        onDragEnd={() => setGezogeneKarteId(null)}
                      />
                    ))
                  : packs[index]?.map((karte) => (
                      <Spielkarte
                        key={karte.id}
                        karte={karte}
                        verdeckt
                      />
                    ))}
              </div>
           ) : phase === 'vierling' ? (
  <div className="karten vierling-bereich mit-vierling">
    {(packs[index]?.[0] || []).map((karte) => (
      <Spielkarte
        key={karte.id}
        karte={karte}
        verdeckt={false}
      />
    ))}
  </div>
) : (
  <div className="karten">
    {haende[index].map((karte) => (
                  <Spielkarte
                    key={karte.id}
                    karte={karte}
                    verdeckt={index !== 3}
                  />
                ))}
                
              </div>
            )}

            {phase === 'runde' && (
              <span className="kartenanzahl">
                {aktuelleAufdeckungen.some(
                  (eintrag) => eintrag.spielerIndex === index,
                )
                  ? 'Aufgedeckt'
                  : 'Verdeckt'}
              </span>
            )}
          </div>
        ))}
        {phase === 'packs' && (
          <div className="sortier-auf-dem-tisch">
            <h3>Deine vier Packs</h3>

            <div className="packs-auswahl">
              {packs.slice(0, 4).map((pack, index) => {
                const maximaleKartenanzahl = index === 0 ? 4 : 3
  const packsVoll =
    (packs[0].length === 3 ||
      (packs[0].length === 4 && istVierling(packs[0]))) &&
    packs[1].length === 3 &&
    packs[2].length === 3 &&
    packs[3].length === 3

  const packFalsch =
    packsVoll &&
    index < 3 &&
    vergleichePacks(pack, packs[index + 1]) < 0
                return (
                  <div
                    className={`pack-feld ${
  pack.length === maximaleKartenanzahl ? 'pack-voll' : ''
} ${packFalsch ? 'pack-falsch' : ''}`}
                    key={index}
                    onDragOver={(event) => {
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'move'
                    }}
                    onDrop={(event) => handleDropInPack(event, index)}
                  >
                    <h4>Pack {index + 1}</h4>

                    <div className="karten pack-karten">
                      {pack.map((karte) => (
                        <Spielkarte
                          key={karte.id}
                          karte={karte}
                          draggable
                          ausgewaehlt={gezogeneKarteId === karte.id}
                          onClick={() => entferneAusPack(karte, index)}
                          onDragStart={(event) => {
                            event.dataTransfer.setData(
                              'text/plain',
                              karte.id,
                            )
                            event.dataTransfer.effectAllowed = 'move'
                            handleDragStart(karte, 'pack')
                          }}
                          onDragEnd={() => setGezogeneKarteId(null)}
                        />
                      ))}

                      {pack.length === 0 && (
                        <span className="pack-leer">
                          Karten hier ablegen
                        </span>
                      )}
                    </div>

                    <span className="pack-zaehler">
                      {pack.length} / {maximaleKartenanzahl} Karten
                    </span>
                  </div>
                )
              })}
            </div>

            <p>Noch nicht einsortiert: {sortierteHand.length} Karten</p>

            {ablegeKarte && (
              <p>
                Abgelegte Karte: {ablegeKarte.name}{' '}
                {ablegeKarte.symbol}
              </p>
            )}

           {packs[0].length === 4 && istVierling(packs[0]) &&
  sortierteHand.length > 0 && (
    <button
  type="button"
  onClick={karteAblegen}
  disabled={
    packs[0].length === 3 &&
    packs[1].length === 3 &&
    packs[2].length === 3 &&
    packs[3].length === 3 &&
    [0, 1, 2].some(
      (i) => vergleichePacks(packs[i], packs[i + 1]) < 0,
    )
  }
>
  Restkarten ablegen
</button>
  )}
           {sortierteHand.length === 0 &&
  (
    (!(packs[0].length === 4 && istVierling(packs[0])) &&
      packs.every((pack) => pack.length === 3) &&
      ablegeKarte) ||
    (packs[0].length === 4 && istVierling(packs[0]) &&
      (packs.slice(0, 3).every((pack) => pack.length === 3) ||
        abgelegteRestkarten.length > 0))
  ) && (
    <button type="button" onClick={starteRunden}>
      Runden starten
    </button>
  )}
{packs[0].length !== 4 &&
  packs.every((pack) => pack.length === 3) &&
  sortierteHand.length === 1 && (
    <button
  type="button"
  onClick={karteAblegen}
  disabled={
    packs.every((pack) => pack.length === 3) &&
    [0, 1, 2].some(
      (i) => vergleichePacks(packs[i], packs[i + 1]) < 0,
    )
  }
>
  Letzte Karte ablegen
</button>
  )}

          </div>
        )}
      </section>

     
      <footer className="fusszeile">
        <span>♠</span> CHARWALI <span>♦</span>
      </footer>
    </main>
  )
}