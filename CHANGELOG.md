# Historia zmian / Changelog

Każda wersja opisuje, co nowego wnosi (**Nowe**), co się zmieniło (**Zmiany**) i co naprawiono (**Poprawki**).
Each release lists what is new (**Added**), what changed (**Changed**) and what was fixed (**Fixed**).

🇵🇱 [Polski](#polski) · 🇬🇧 [English](#english)

---

## Polski

### 1.0.10 – 18.11.2026
**Nowe**
- Strona **Baterie**: przycisk **Edytuj** – zmiana nazwy urządzenia, ukrywanie (ukryte nie liczą się na kafelku ani w alertach) i wybór progu wymiany baterii (10–30%).
- Sekcja **Tablety i telefony** – procent, „Ładuje się” i pomieszczenie. Ten sam tablet zapisany w HA dwa razy (aplikacja HA i kiosk) pokazuje się raz, ze świeższym odczytem.

**Zmiany**
- Czujniki i piloty w dwóch równych kolumnach, posortowane od najsłabszej baterii; jedno urządzenie = jedna pozycja (koniec z kilkoma bateriami tego samego auta).
- Auta nie pojawiają się na liście baterii – mają własne strony.
- Ładujący się tablet lub telefon nie wywołuje alertu „Słaba bateria”.
- Dotknięcie kafla Baterie otwiera pełną stronę Baterie.

### 1.0.9 – 18.11.2026
**Nowe**
- Kafel **Pogoda – prognoza** (jak w Rehome, przezroczyste szkło): temperatura teraz, opis, maks./min., prognoza godzinowa i na kolejne dni z kolorowymi paskami. Sam dopasowuje się do rozmiaru – na szerokim, niskim kafelku układa się w dwie kolumny i zawsze pokazuje tylko to, co mieści się w całości.

**Poprawki**
- Telefon: tapeta jest na całym przewijanym ekranie (wcześniej niżej robiło się czarne tło albo tapeta się powtarzała).

### 1.0.8 – 18.11.2026
**Nowe**
- Ustawienia → **Zdjęcia**: album Panelu w mediach Home Assistanta (folder Panel – widać go też w przeglądarce mediów HA). Dodawanie zdjęć z tego urządzenia, z telefonu (kod QR – telefon od razu wysyła zdjęcia) i z folderu www Home Assistanta. Miniatury z usuwaniem i wybór, co pokazuje twarz Zdjęcia (zdjęcia Panelu, folder www albo wszystkie).
- Ustawienia → **Tło**: te same trzy sposoby wyboru własnego tła – z tego urządzenia, z telefonu (kod QR) oraz ze zdjęć Panelu lub folderu www.

**Zmiany**
- Twarz Zdjęcia nie pokazuje już ikon i obrazków wgranych do kafli – tylko zdjęcia z albumu i folderu www.

### 1.0.7 – 18.11.2026
**Nowe**
- **Paski z alertami** na górze ekranu – pokazują się tylko, gdy coś wymaga uwagi: drzwi lub okno otwarte za długo, słaba bateria w czujniku, auto naładowane, alarm uzbrojony na „wyjście”, a ktoś jest w domu. Dotknięcie otwiera szczegóły, × chowa alert do następnej zmiany. Ustawienia → Alerty.
- **Historia układu** – Panel zapisuje kopię układu przed każdą zmianą (ostatnie 40) i pozwala ją przywrócić. Ustawienia → Historia układu.
- **Budzenie ruchem** – przełącznik „Budź ruchem przed tabletem”: czujnik ruchu tego tabletu chowa wygaszacz z zegarem. Tablet sam rozpoznaje swój czujnik (aplikacja Kiosk). Ustawienia → Wygaszacz i zegar nocny.
- **Własne tło** – zdjęcie z telefonu lub komputera jako tapeta twarzy. Ustawienia → Tło.
- **Szklaność kafli** – suwak od „Przezroczyste” do „Mleczne”. Ustawienia → Tło.

**Zmiany**
- Kosz czekający na potwierdzenie ma jasne tło jak zapalony kafel (ikona dalej miga).

### 1.0.6 – 17.11.2026
**Nowe**
- Kafel **Zdjęcie**: pole **Własne zdjęcie** – wgrywasz zdjęcie z telefonu lub komputera, wybierasz z folderu www albo zdjęcie z HA. Do tego podpis na dole kafla i dopasowanie („Wypełnij kafel” / „Pokaż całe zdjęcie”). Dotknięcie kafla otwiera zdjęcie w powiększeniu.
- Kafel **Osoba**: pole **Własne zdjęcie** – pokazuje się w kółku zamiast zdjęcia z Home Assistant.

### 1.0.5 – 17.11.2026
**Nowe**
- Ustawienia → Tło: przełącznik **Tylko na tym ekranie** – telefon, tablet czy komputer może mieć własną tapetę, a pozostałe ekrany zostają przy wspólnej. Po wyłączeniu ekran wraca do wspólnej tapety.

### 1.0.4 – 17.11.2026
**Nowe**
- Kafel auta: opcja **Wielkość zdjęcia (%)** w edytorze kafla – możesz ręcznie powiększyć lub zmniejszyć zdjęcie auta.

**Poprawki**
- Zdjęcia aut mają podobną wielkość: wyższe (mniej panoramiczne) zdjęcia są automatycznie zmniejszane, więc nie wchodzą już pod nazwę auta.

### 1.0.3 – 17.11.2026
**Zmiany**
- Kafel koszy: przypomnienie „dotknij, gdy wystawiony” pokazuje się od 17:00 w dniu wystawiania (przy myciu od 17:00 dzień wcześniej), czyli wtedy, gdy potwierdzenie jest kasowane.
- Ikona kosza miga, dopóki nie potwierdzisz.

**Poprawki**
- Stare potwierdzenie z poprzedniego tygodnia nie pokazuje się już jako „✓ wystawiony”.
- Napisy na kaflu koszy („jutro”, „dziś” itd.) są tłumaczone na angielski.

### 1.0.2 – 17.11.2026
**Nowe**
- Telefon: przyciski **Aplikacje** i **Ustawienia** w prawym górnym rogu strony głównej.
- Telefon: przycisk ⚙ w trybie edycji.

**Zmiany**
- Telefon: ustawienia na cały ekran – najpierw lista kategorii, potem kategoria ze strzałką ‹ do powrotu.

**Poprawki**
- Na iPhonie przytrzymanie palcem nie otwiera już systemowego menu kopiowania.
- Pasek edycji na telefonie nie zasłania kafli.

### 1.0.1 – 17.11.2026
**Nowe**
- Ekran Dom: przycisk **⇅ Kolejność** – ustawiasz kolejność pomieszczeń strzałkami ▲ ▼. Kolejność zapisuje się od razu i jest wspólna dla wszystkich ekranów.

### 1.0.0 – 15.11.2026
**Nowe**
- Pierwsze publiczne wydanie: szklany dashboard ścienny z twarzami, stronami kafli, edycją dotykiem, własnymi ikonami,
  mini aplikacjami (Muzyka, Zegar, Przypomnienia, Pogoda), zegarem nocnym, wygaszaczem, dzwonkiem na cały ekran,
  trybem kiosku oraz wersją polską i angielską.
- Automatyczny układ startowy na podstawie encji w Twoim Home Assistant.

---

## English

### 1.0.10 – 2026-11-18
**Added**
- **Batteries** page: **Edit** button – rename a device, hide it (hidden devices don't count on the tile or in alerts) and pick the battery replacement threshold (10–30%).
- **Tablets & phones** section – percentage, “Charging” and room. A tablet listed twice in HA (HA app and kiosk) is shown once, with the fresher reading.

**Changed**
- Sensors and remotes in two even columns, sorted from the weakest battery; one device = one entry (no more several batteries for the same car).
- Cars are left out of the battery list – they have their own pages.
- A charging tablet or phone no longer triggers the “Low battery” alert.
- Tapping the Batteries tile opens the full Batteries page.

### 1.0.9 – 2026-11-18
**Added**
- **Weather – forecast** tile (like Rehome, clear glass): current temperature, condition, high/low, hourly forecast and the next days with colour bars. It adapts to its size – on a wide, short tile it switches to two columns and only shows what fits completely.

**Fixed**
- Phone: the wallpaper now covers the whole scrolling screen (before, the lower part turned black or the wallpaper repeated).

### 1.0.8 – 2026-11-18
**Added**
- Settings → **Photos**: a Panel album in Home Assistant's media (folder Panel – it shows in HA's Media browser too). Add photos from this device, from your phone (QR code – the phone sends the photos straight away) and from Home Assistant's www folder. Thumbnails with delete, and a choice of what the Photos face shows (Panel photos, the www folder or all).
- Settings → **Wallpaper**: the same three ways to pick your own wallpaper – from this device, from your phone (QR code) and from Panel photos or the www folder.

**Changed**
- The Photos face no longer shows icons and images uploaded for tiles – only album photos and the www folder.

### 1.0.7 – 2026-11-18
**Added**
- **Alert banners** at the top of the screen – shown only when something needs attention: a door or window open too long, a low sensor battery, a car fully charged, the alarm armed away while someone is home. Tap for details, × hides the alert until the next change. Settings → Alerts.
- **Layout history** – Panel saves a copy of the layout before every change (the last 40) and lets you restore it. Settings → Layout history.
- **Wake on motion** – "Wake on motion in front of the tablet" switch: the tablet's own motion sensor hides the clock screensaver. The tablet finds its own sensor (Kiosk app). Settings → Screensaver and night clock.
- **Own wallpaper** – a photo from your phone or computer as a face's wallpaper. Settings → Wallpaper.
- **Tile glass** – a slider from "Clear" to "Frosted". Settings → Wallpaper.

**Changed**
- A bin waiting for confirmation has a light background like a tile that is on (the icon still blinks).

### 1.0.6 – 2026-11-17
**Added**
- **Photo** tile: **Your own photo** field – upload a photo from a phone or computer, pick one from the www folder or use an image from HA. Plus an optional caption and a fit option ("Fill the tile" / "Show the whole photo"). Tapping the tile shows the photo enlarged.
- **Person** tile: **Own photo** field – shown in the circle instead of the Home Assistant picture.

### 1.0.5 – 2026-11-17
**Added**
- Settings → Wallpaper: **Only on this screen** switch – a phone, tablet or computer can have its own wallpaper while other screens keep the shared one. Turn it off to go back to the shared wallpaper.

### 1.0.4 – 2026-11-17
**Added**
- Car tile: **Photo size (%)** option in the tile editor to make a car photo bigger or smaller by hand.

**Fixed**
- Car photos now look the same size: taller (less panoramic) photos are scaled down automatically, so they no longer overlap the car name.

### 1.0.3 – 2026-11-17
**Changed**
- Bins tile: the "tap when put out" reminder starts at 17:00 on put-out day (for washing, 17:00 the day before), when the confirmation is reset.
- The bin icon blinks until you confirm.

**Fixed**
- An old confirmation from the previous week no longer shows as "✓ put out".
- Bin labels ("tomorrow", "today" and so on) are translated to English.

### 1.0.2 – 2026-11-17
**Added**
- Phone: **Apps** and **Settings** buttons in the top-right corner of the home screen.
- Phone: a ⚙ button in edit mode.

**Changed**
- Phone: full-screen settings – a list of categories first, then the category with a ‹ back arrow.

**Fixed**
- On iPhone, a long press no longer opens the system copy menu.
- The edit bar no longer covers tiles on a phone.

### 1.0.1 – 2026-11-17
**Added**
- Home screen: **⇅ Order** button to set the room order with ▲ ▼ arrows. The order is saved straight away and shared by all screens.

### 1.0.0 – 2026-11-15
**Added**
- First public release: glass wall dashboard with faces, tile pages, touch editing, custom icons,
  mini apps (Music, Clock, Reminders, Weather), night clock, screensaver, full-screen doorbell,
  kiosk mode, Polish and English UI.
- Automatic starting layout based on the entities in your Home Assistant.
