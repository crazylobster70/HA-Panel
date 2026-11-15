# Panel – glass wall dashboard for Home Assistant

🇵🇱 [Polski](#polski) · 🇬🇧 [English](#english)

---

## Polski

**Panel** to App (dodatek) do Home Assistanta: szklany dashboard na tablet ścienny w stylu iOS. Wszystko ustawiasz palcem na tablecie, bez YAML-a. Interfejs jest po polsku i po angielsku.

### Co potrafi
- **Twarze** (ekrany główne) z kaflami: pogoda, osoby, kamera/dzwonek, termostat, światła, drzwi i okna, energia, baterie, system, alarm, kamery, pomieszczenia, auta, kosze i wiele innych.
- **Każdy kafel otwiera swoją stronę**: Dom z pomieszczeniami, Światła, Drzwi i okna, Baterie, Alarm z klawiaturą, System, Kamery (z edycją i przeciąganiem), pełna pogoda godzinowa i na 7 dni.
- **Edycja dotykiem**: przytrzymaj kafel, żeby przestawiać, zmieniać rozmiar, nazwę, ikonę (siatka, ponad 7000 ikon Material Design, emoji albo własny obrazek), wielkość ikony, dolny napis i wyrównanie.
- **Mini-aplikacje**: Muzyka (Music Assistant: biblioteka, wyszukiwanie, sterowanie), Zegar (zegar światowy, budziki, minutniki), Przypomnienia (listy zadań), Pogoda.
- **Tablet ścienny**: zegar nocny, wygaszacz z zegarem, dzwonek na cały ekran (z dźwiękiem), tryb kiosku (ukrywa pasek boczny HA), żywsze kolory dla tanich ekranów, samouczek gestów.
- **Podstrony**: Energia (np. Octopus), samochody (zasięg, ładowanie, opony, mapa OpenStreetMap), puste strony do własnych kafli.
- Działa na tablecie, telefonie i komputerze, układ sam dopasowuje się do ekranu.

### Instalacja
1. W Home Assistant: **Ustawienia → Apps → App Store → ⋮ → Repozytoria**.
2. Dodaj adres tego repozytorium: `https://github.com/crazylobster70/ha-panel`.
3. Znajdź **Panel**, wybierz **Zainstaluj**, a potem **Uruchom**. Włącz **Pokaż na pasku bocznym**.
4. Otwórz **Panel** z paska bocznego.

**Bez GitHuba (plik ZIP):** rozpakuj paczkę i skopiuj folder `panel` do udziału `addons` (App **Samba share** albo **File editor**), tak żeby powstał plik `addons/panel/config.yaml`. Potem **App Store → ⋮ → Sprawdź aktualizacje**: Panel pojawi się w sekcji **Local apps**.

### Pierwsze uruchomienie
Panel sam dobiera układ do Twojego Home Assistanta: dodaje pogodę, osoby (do trzech), kamerę dzwonka, termostat, alarm i kamery, o ile je masz, oraz kafle zbiorcze (światła, drzwi i okna, energia, pomieszczenia, baterie, system). Resztę ustawiasz palcem:
- **Przytrzymaj kafel**: edycja (rozmiar, kolejność, ⚙ ustawienia, usuwanie).
- **Przytrzymaj tło**: galeria twarzy (nowe ekrany, tapety, kolumny).
- **Przesuń od dołu w górę**: menu aplikacji i **Ustawienia** (język, kolory, tryb kiosku, wygaszacz i zegar nocny, dzwonek).

Układ zapisuje się w `addon_configs/<slug>_panel/layout.json` i jest wspólny dla wszystkich ekranów. Ustawienia wyświetlania (język, wygaszacz, kolory, kiosk) są osobne dla każdego urządzenia.

### Wymagania
- Home Assistant OS lub Supervised (Apps).
- Opcjonalnie: Music Assistant (aplikacja Muzyka), integracja kalendarza (kosze), Local To-do (Przypomnienia).
- Mapa samochodu korzysta z OpenStreetMap, a ikony Material Design pobierają się raz przez Home Assistant. Oba wymagają dostępu do internetu.

---

## English

**Panel** is a Home Assistant App (add-on): an iOS-style glass dashboard for wall tablets. Everything is configured by touch on the tablet, with no YAML. The UI is available in Polish and English (switch in **Settings → Language**).

### Features
- **Faces** (home screens) with tiles: weather, people, camera/doorbell, thermostat, lights, doors & windows, energy, batteries, system, alarm, cameras, rooms, cars, bins and more.
- **Every tile opens its own page**: Home with rooms, Lights, Doors & windows, Batteries, Alarm with keypad, System, Cameras (editable, drag & drop), full hourly and 7-day weather.
- **Touch editing**: long-press a tile to move, resize, rename, change the icon (grid, 7000+ Material Design icons, emoji or your own image), icon size, bottom text and alignment.
- **Mini apps**: Music (Music Assistant: library, search, playback), Clock (world clock, alarms, timers), Reminders (to-do lists), Weather.
- **Wall tablet extras**: night clock, clock screensaver, full-screen doorbell with chime, kiosk mode (hides the HA sidebar), vivid colours for cheaper screens, gesture tutorial.
- **Pages**: Energy (e.g. Octopus), cars (range, charging, tyres, OpenStreetMap), empty pages for your own tiles.
- Works on tablets, phones and desktops, and adapts to any screen size.

### Installation
1. In Home Assistant go to **Settings → Apps → App Store → ⋮ → Repositories**.
2. Add this repository: `https://github.com/crazylobster70/ha-panel`.
3. Find **Panel**, click **Install**, then **Start**. Enable **Show in sidebar**.
4. Open **Panel** from the sidebar.

**Without GitHub (ZIP):** unzip and copy the `panel` folder into the `addons` share (via the **Samba share** or **File editor** app), so that you get `addons/panel/config.yaml`. Then go to **App Store → ⋮ → Check for updates**, and Panel appears under **Local apps**.

### First run
Panel builds a starting layout from your Home Assistant. It adds weather, up to three people, a doorbell camera, thermostat, alarm and cameras if you have them, plus summary tiles (lights, doors & windows, energy, rooms, batteries, system). Customise the rest by touch:
- **Long-press a tile** to edit it (size, order, ⚙ settings, remove).
- **Long-press the background** to open the face gallery (new screens, wallpapers, columns).
- **Swipe up from the bottom** to open the app menu and **Settings** (language, colours, kiosk mode, screensaver & night clock, doorbell).

The layout is stored in `addon_configs/<slug>_panel/layout.json` and shared by all screens. Display settings (language, screensaver, colours, kiosk) are per device.

### Requirements
- Home Assistant OS or Supervised (Apps).
- Optional: Music Assistant (Music app), a calendar integration (bins), Local To-do (Reminders).
- The car map uses OpenStreetMap, and Material Design icons are fetched once through Home Assistant. Both need internet access.

---

License: MIT. Bundled font Inter Display: SIL Open Font License 1.1 (`panel/app/www/fonts/OFL.txt`).
