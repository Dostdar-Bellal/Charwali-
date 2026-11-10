import { useEffect, useState } from 'react'
import './App.css'

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

const spielerNamen = [
  'Rechter Spieler',
  'Mittlerer Spieler',
  'Linker Spieler',
  'Du',
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
    <div className="karten">
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
  const [phase, setPhase] = useState('bereit')
  const [ziehungen, setZiehungen] = useState([])
  const [kartengeber, setKartengeber] = useState(null)
  const [haende, setHaende] = useState([[], [], [], []])
  const [restDeck, setRestDeck] = useState([])
  const [ausgeteilteKarten, setAusgeteilteKarten] = useState(0)

  const [meldung, setMeldung] = useState(
    'Bereit? Ziehe zuerst vier Karten, um den Kartengeber zu bestimmen.',
  )

  const [ablegeKarte, setAblegeKarte] = useState(null)
  const [sortierteHand, setSortierteHand] = useState([])
  const [packs, setPacks] = useState([[], [], [], []])
const [vierlingPacks, setVierlingPacks] = useState([null, null, null, null])
  const [runde, setRunde] = useState(0)
  const [aufdeckReihenfolge, setAufdeckReihenfolge] = useState([])
  const [aufdeckPosition, setAufdeckPosition] = useState(0)
  const [rundeErgebnisse, setRundeErgebnisse] = useState([])
  const [aktuelleAufdeckungen, setAktuelleAufdeckungen] = useState([])

  const [vierlingGewinner, setVierlingGewinner] = useState(null)
  const [vierlingRang, setVierlingRang] = useState(null)

  const [topf, setTopf] = useState(4)
  const [gewinne, setGewinne] = useState([0, 0, 0, 0])
  const [gezogeneKarteId, setGezogeneKarteId] = useState(null)

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
    const gezogeneKarten = mischen(neuesDeck()).slice(0, 4)
    const farbenReihenfolge = ['Pik', 'Herz', 'Karo', 'Kreuz']

    const ziehungenMitSpieler = gezogeneKarten
      .map((karte, index) => ({
        spieler: spielerNamen[index],
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

    const gewinner = ziehungenMitSpieler.find(
      (eintrag) => eintrag.karte.rang === hoechsterRang,
    ).spieler

    setZiehungen(ziehungenMitSpieler)
    setKartengeber(gewinner)
    setHaende([[], [], [], []])
    setRestDeck([])
    setAusgeteilteKarten(0)
    setPhase('gezogen')
    setMeldung(
      `Kartengeber: ${gewinner}. Die höchste gezogene Karte entscheidet.`,
    )
  }

  function kartenVerteilen() {
    if (phase !== 'gezogen') return

    setRestDeck(mischen(neuesDeck()))
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
    setTopf(4)
    setGewinne([0, 0, 0, 0])
    setGezogeneKarteId(null)
    setPhase('verteilen')
    setMeldung('Die Karten werden einzeln ausgeteilt …')
  }

  // Karte aus der Hand in eines der vier Packs legen.
  function kartePackHinzufuegen(karte, packIndex) {
    if (phase !== 'packs') return
    if (packIndex < 0 || packIndex > 3) return

    const maximaleKartenanzahl = packIndex === 0 ? 4 : 3

    if (packs[packIndex].length >= maximaleKartenanzahl) {
      setMeldung(
        'Pack ' + (packIndex + 1) + ' ist bereits voll.',
      )
      return
    }

    if (!sortierteHand.some((k) => k.id === karte.id)) {
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

    const alterPackIndex = packs.findIndex((pack) =>
      pack.some((k) => k.id === id),
    )

    if (alterPackIndex < 0 || alterPackIndex === packIndex) {
      return
    }

    const maximaleKartenanzahl = packIndex === 0 ? 4 : 3

    if (packs[packIndex].length >= maximaleKartenanzahl) {
      setMeldung(
        'Pack ' +
          (packIndex + 1) +
          ' ist voll. Die Karte bleibt im bisherigen Pack.',
      )
      return
    }

    const karte = packs[alterPackIndex].find((k) => k.id === id)

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
    setMeldung(
      'Karte in Pack ' + (packIndex + 1) + ' verschoben.',
    )
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

    const anderePacksVoll = packs
      .slice(1)
      .every((pack) => pack.length === 3)

    if (!anderePacksVoll || packs[0].length !== 3) {
      setMeldung(
        'Zum Ablegen müssen Pack 1 drei Karten und die anderen Packs jeweils drei Karten enthalten.',
      )
      return
    }

    if (sortierteHand.length !== 1) {
      setMeldung(
        'Es muss genau eine Karte zum Ablegen übrig bleiben.',
      )
      return
    }

    setAblegeKarte(sortierteHand[0])
    setSortierteHand([])
    setMeldung(
      'Die letzte Karte wurde abgelegt. Du kannst jetzt die Runden starten.',
    )
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

  for (
    let packIndex = 0;
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

    const anderePacksVoll = packs
      .slice(1)
      .every((pack) => pack.length === 3)

    if (!anderePacksVoll) {
      setMeldung(
        'Die Packs 2, 3 und 4 müssen jeweils drei Karten enthalten.',
      )
      return
    }

    if (packs[0].length !== 3 && packs[0].length !== 4) {
      setMeldung(
        'Pack 1 muss drei Karten oder einen Vierling mit vier Karten enthalten.',
      )
      return
    }

    if (packs[0].length === 4 && !istVierling(packs[0])) {
      setMeldung(
        'Vier Karten in Pack 1 müssen denselben Rang haben.',
      )
      return
    }

    if (packs[0].length === 3 && !ablegeKarte) {
      setMeldung(
        'Bitte lege die letzte Karte ab, bevor du die Runden startest.',
      )
      return
    }

    if (sortierteHand.length !== 0) {
      setMeldung(
        'Bitte sortiere zuerst alle Karten ein.',
      )
      return
    }

    const allePacks = [[], [], [], []]
    const neueVierlinge = [null, null, null, null]

    // Die drei Computer erhalten automatisch ihre Packs.
    for (let i = 0; i < 3; i++) {
      const ergebnis = baueComputerPacks(haende[i])

      allePacks[i] = ergebnis.computerPacks
      neueVierlinge[i] = ergebnis.vierling
    }

    // Deine vier Packs bleiben unverändert.
    allePacks[3] = packs.map((pack) => [...pack])

    setPacks(allePacks)
    setVierlingPacks(neueVierlinge)

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
      const vierlinge = []

      // Vierlinge der Computer aus Pack 0.
      vierlingPacks.forEach((karten, index) => {
        if (karten && istVierling(karten)) {
          vierlinge.push({
            spielerIndex: index,
            karten,
          })
        }
      })

      // Ein eigener Vierling wird durch Pack 1 aufgedeckt.
      neueAufdeckungen.forEach((eintrag) => {
        if (istVierling(eintrag.karten)) {
          vierlinge.push({
            spielerIndex: eintrag.spielerIndex,
            karten: eintrag.karten,
          })
        }
      })

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

    setTopf((alt) => Math.max(0, alt - 1))
    setPhase('auswertung')

    setMeldung(
      'Alle vier Spieler haben aufgedeckt. ' +
        spielerNamen[beste.spielerIndex] +
        ' gewinnt Runde ' +
        (runde + 1) +
        '.',
    )
  }



function naechsteRundeStarten() {
  if (phase !== 'auswertung') return

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
    setVierlingPacks([null, null, null, null])
    setSortierteHand([])
    setAblegeKarte(null)
    setGezogeneKarteId(null)

    setTopf(4)

    // Der Gewinner der vierten Runde ist der neue Kartengeber.
    // Eine erneute Ziehung entfällt.
    setPhase('gezogen')
    setMeldung(
      'Neuer Kartengeber: ' +
        neuerKartengeber +
        '. Klicke auf „Karten verteilen“, um das neue Spiel zu beginnen.',
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

      <div className="steuerung">
        {!['bereit', 'fertig', 'vierling', 'beendet'].includes(phase) && (
  <button
    type="button"
    onClick={() => {
      setPhase('beendet')
      setMeldung('Das Spiel wurde beendet.')
    }}
  >
    Spiel beenden
  </button>
)}
        {phase === 'bereit' && (
          <button onClick={kartenZiehen}>4 Karten ziehen</button>
        )}

        {phase === 'gezogen' && (
          <button onClick={kartenVerteilen}>Karten verteilen</button>
        )}

        {phase === 'verteilen' && (
          <p>Die Karten werden automatisch ausgeteilt …</p>
        )}

        {phase === 'sortieren' && (
          <p>Deine Karten werden vorbereitet …</p>
        )}

        {phase === 'packs' && (
          <p>
            Pack 1 darf 3 oder 4 Karten enthalten. Die anderen Packs
            enthalten jeweils 3 Karten.
          </p>
        )}

        {phase === 'runde' && (
          <button onClick={naechsteAufdeckung}>
            {aufdeckPosition === 3
              ? `Letztes Pack aufdecken – Runde ${runde + 1} auswerten`
              : 'Nächstes Pack aufdecken'}
          </button>
        )}

        {phase === 'auswertung' && (
          <button onClick={naechsteRundeStarten}>
          {runde === 3 ? 'Neuer Kartengeber' : 'Nächste Runde'}
{runde === 3
? `Neuer Kartengeber: ${spielerNamen[rundeErgebnisse[runde]?.gewinner] || ''}`
: 'Nächste Runde'}


          </button>
        )}

        {(phase === 'fertig' || phase === 'vierling') && (
          <button onClick={neuesSpiel}>Neues Spiel</button>
        )}
      </div>

      <section className="statusbereich" aria-live="polite">
        <div className="status-titel">SPIELZÄHLER</div>
        <p>{meldung}</p>

        <p>
          <strong>Topf:</strong> {topf} Einsätze
        </p>

        {vierlingRang !== null && phase === 'vierling' && (
          <p>
            <strong>Vierling:</strong> vier {werte.find((wert) => wert.rang === vierlingRang)?.name}
          </p>
        )}

        <div className="rundenzaehler">
          {rundeErgebnisse.map((ergebnis) => (
            <div className="runde" key={ergebnis.runde}>
              <span>{ergebnis.runde}. Runde</span>
              <strong>
                Gewinner: {spielerNamen[ergebnis.gewinner]}
              </strong>
            </div>
          ))}
        </div>
      </section>

      {ziehungen.length > 0 && phase === 'gezogen' && (
        <section className="ziehbereich">
          <h2>Gezogene Karten</h2>
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
        </section>
      )}

      <section className={`tisch ${phase === 'packs' ? 'pack-phase' : ''}`}>
        <div className="tisch-mitte">
  <div className="ornament">✦</div>
  <h2>CHARWALI</h2>

  <div className="gemeinsamer-topf">
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
            <h3>{name}</h3>

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
                  verdeckt
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
                          const ersterFreierPack = packs.findIndex(
                            (pack, packIndex) =>
                              pack.length < (packIndex === 0 ? 3 : 3),
                          )

                          if (ersterFreierPack >= 0) {
                            kartePackHinzufuegen(
                              karte,
                              ersterFreierPack,
                            )
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
              {packs.map((pack, index) => {
                const maximaleKartenanzahl = index === 0 ? 4 : 3

                return (
                  <div
                    className={`pack-feld ${
                      pack.length === maximaleKartenanzahl
                        ? 'pack-voll'
                        : ''
                    }`}
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

            {packs[0].length === 3 &&
              packs.slice(1).every((pack) => pack.length === 3) &&
              sortierteHand.length === 1 && (
                <button type="button" onClick={karteAblegen}>
                  Letzte Karte ablegen
                </button>
              )}

            {packs[0].length === 4 &&
              packs.slice(1).every((pack) => pack.length === 3) &&
              sortierteHand.length === 0 && (
                <button type="button" onClick={starteRunden}>
                  Runden starten
                </button>
              )}

            {packs[0].length === 3 &&
              packs.slice(1).every((pack) => pack.length === 3) &&
              sortierteHand.length === 0 &&
              ablegeKarte && (
                <button type="button" onClick={starteRunden}>
                  Runden starten
                </button>
              )}
          </div>
        )}
      </section>

     {(phase === 'fertig' || phase === 'vierling' || phase === 'beendet') && (
  <section className="sortierbereich">
          <h2>Spielergebnisse</h2>

          {phase === 'vierling' && (
            <p>
              {vierlingGewinner} gewinnt mit vier gleichen Karten
              den ganzen Topf.
            </p>
          )}

          <div className="rundenzaehler">
            {spielerNamen.map((name, index) => (
              <div className="runde" key={name}>
                <span>{name}</span>
                <strong>{gewinne[index]} gewonnene Einsätze</strong>
              </div>
            ))}
          </div>

          {phase === 'fertig' && (
            <p>
              Neuer Kartengeber: <strong>{kartengeber}</strong>
            </p>
          )}
        </section>
      )}

      <footer className="fusszeile">
        <span>♠</span> CHARWALI <span>♦</span>
      </footer>
    </main>
  )
}