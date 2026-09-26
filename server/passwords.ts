export interface Password {
  category: string;
  answer: string;
}

// Podchwytliwe hasła: temat pasuje do hasła tylko przez grę słów, drugie znaczenie albo skojarzenie.
const BANK: Record<string, string[]> = {
  "Dania i napoje": ["Kopenhaga", "Mała Syrenka", "Klocki Lego", "Książę Hamlet"],
  "Napoje": ["Nawarzyć piwa", "Mleko się rozlało", "Kawa na ławę", "Sok z gumijagód", "Woda na młyn"],
  "Części ciała": ["Stopa procentowa", "Oko cyklonu", "Głowa państwa", "Ząb czasu", "Język programowania", "Ucho igielne", "Palec boży"],
  "Instrumenty muzyczne": ["Organy wewnętrzne", "Trąba powietrzna", "Trójkąt bermudzki", "Latający talerz", "Róg obfitości", "Błona bębenkowa"],
  "Owoce": ["Granat ręczny", "Jabłko Adama", "Wielkie Jabłko", "Gruszki na wierzbie", "Figa z makiem", "Mechaniczna pomarańcza", "Banan na twarzy"],
  "Warzywa": ["Kij i marchewka", "Groch z kapustą", "Jaś Fasola", "Gorący kartofel"],
  "Zwierzęta": ["Koń trojański", "Kaczka dziennikarska", "Czarna owca", "Mól książkowy", "Szczur lądowy", "Wilk morski", "Mysz komputerowa", "Słoń w składzie porcelany"],
  "Zwierzęta gospodarskie": ["Krówka ciągutka", "Świnka skarbonka", "Kozioł ofiarny", "Koń by się uśmiał", "Siedzieć w kozie"],
  "Ptaki": ["Ranny ptaszek", "Gęsia skórka", "Gołąbki", "Orzeł czy reszka", "Kurze łapki", "Struś Pędziwiatr", "Kaczka po pekińsku"],
  "Psy": ["Hot dog", "Pies ogrodnika", "Wilczy bilet", "Szczenięce lata", "Psi obowiązek"],
  "Koty": ["Kocie łby", "Kot w worku", "Kot w butach", "Kocie oczko"],
  "Owady": ["Muszka do smokingu", "Zakupy w Biedronce", "Motylki w brzuchu", "Styl motylkowy"],
  "Ryby": ["Rekin biznesu", "Skok na szczupaka", "Zdrowy jak ryba", "Gruba ryba", "Śledzie do namiotu"],
  "Płazy": ["Styl żabka", "Żabie udka"],
  "Pogoda": ["Burza mózgów", "Grad pytań", "Burza w szklance wody", "Ospa wietrzna", "Przeminęło z wiatrem", "Dziadek Mróz", "Królewna Śnieżka"],
  "Pory roku": ["Wiosna Ludów", "Babie lato", "Jesień życia", "Zimna wojna"],
  "Sport": ["Maraton serialowy", "Skok w bok", "Rzut oka", "Bieg wydarzeń", "Zapasy na zimę", "Piłka do metalu", "Bramka SMS", "Kosz na śmieci", "Siatka szpiegowska", "Rakieta kosmiczna", "Sweter z golfem"],
  "Kolory": ["Czerwony Kapturek", "Biały kruk", "Zielone światło", "Szara strefa", "Różowe okulary", "Niebieski ptak"],
  "Pierwiastki": ["Złota rączka", "Żelazna dama", "Ołowiany żołnierzyk", "Półwysep Helski", "Ruda żelaza"],
  "Planety": ["Ziemia obiecana", "Wenus z Milo", "Plutonowy", "Freddie Mercury", "Batonik Mars"],
  "Gwiazdy": ["Gwiazda betlejemska", "Rozgwiazda", "Gwiazdka z nieba"],
  "Kosmos": ["Zaćmienie umysłu", "Czarna dziura w budżecie", "Wielki Wóz"],
  "Nabiał": ["Masło maślane", "Droga Mleczna", "Ząb mleczny", "Śmietanka towarzyska"],
  "Choroby": ["Gorączka złota", "Gorączka sobotniej nocy", "Świnka morska", "Katar sienny"],
  "Kwiaty": ["Róża wiatrów", "Bez odbioru", "Pączek z różą", "Makowiec", "Różyczka"],
  "Drzewa": ["Drzewo genealogiczne", "Palma odbiła", "Jodłowanie", "Totalna lipa"],
  "Meble": ["Szafa grająca", "Stół szwedzki", "Krzesło elektryczne", "Ława przysięgłych", "Biuro podróży", "Kanapka z serem"],
  "Pojazdy": ["Pociąg do wiedzy", "Tramwaj zwany pożądaniem", "Wóz albo przewóz", "Łódź Fabryczna"],
  "Narzędzia": ["Klucz żurawi", "Młot na czarownice", "Gwóźdź programu", "Łopatka", "Klucz do sukcesu"],
  "Zawody": ["Pilot do telewizora", "Kowal własnego losu", "Kląć jak szewc", "Malarz pokojowy"],
  "Kuchnie świata": ["Ryba po grecku", "Placki po węgiersku", "Fasolka po bretońsku", "Śledź po japońsku", "Pierogi ruskie"],
  "Narody i ludy": ["Befsztyk tatarski", "Kawa po turecku"],
  "Ciasta": ["Babka piaskowa", "Stary piernik", "Mazurek Dąbrowskiego"],
  "Kosmetyki": ["Kremówka papieska", "Opera mydlana", "Balsam dla duszy", "Pasta carbonara", "Mydlić komuś oczy"],
  "Szachy": ["Wieża Eiffla", "Skoczek spadochronowy", "Król Lew", "Goniec hotelowy", "Pat i Mat"],
  "Karty do gry": ["Dama z łasiczką", "Talia osy", "Kolor włosów", "As w rękawie"],
  "Gry": ["Kostka masła", "Gra pozorów", "Gra na zwłokę"],
  "Muzyka": ["Skala Richtera", "Brak taktu", "Praca na akord", "Nuta sarkazmu", "Grać pierwsze skrzypce"],
  "Szkoła": ["Tablica rejestracyjna", "Okres kredowy", "Dziennik Ustaw", "Ławka rezerwowych", "Przerwa w dostawie prądu", "Klasa średnia"],
  "Matematyka": ["Koło ratunkowe", "Ułamek sekundy", "Punkt widzenia", "Linia lotnicza", "Liczba mnoga", "Mieć swój kąt"],
  "Programowanie": ["Zmienna pogoda", "Tablica Mendelejewa", "Pętla czasu", "Klasa robotnicza", "Kod pocztowy"],
  "Komputery": ["Wirus grypy", "Sieć rybacka", "Monitor Polski", "Myszka Miki", "Okno na świat"],
  "Chemia": ["Chemia między ludźmi", "Wiązanie krawata", "Pierwiastek kwadratowy", "Związek małżeński"],
  "Fizyka": ["Siła woli", "Masa spadkowa", "Ruch drogowy", "Fala meksykańska", "Fala upałów"],
  "Anatomia": ["Ciało niebieskie", "Kość niezgody", "Mięsień piwny", "Wyspy trzustkowe"],
  "Teatr": ["Akt urodzenia", "Scena zbrodni", "Teatr działań wojennych", "Kurtyna dymna"],
  "Książki": ["Tom Hanks", "Czytać w myślach", "Rozdział majątku", "Tom i Jerry"],
  "Kino": ["Film ochronny", "Seria z karabinu", "Czarny scenariusz"],
  "Elektryka": ["Kontakt z rzeczywistością", "Obwód kaliningradzki", "Pod prąd", "Opór materii", "Iskra boża"],
  "Apteka": ["Plaster miodu", "Zastrzyk gotówki", "Syrop klonowy", "Recepta na sukces"],
  "Kolej": ["Kolej rzeczy", "Tor przeszkód", "Kolejka po chleb"],
  "Podróże": ["Bagaż doświadczeń", "Siedzieć na walizkach", "Podróż za jeden uśmiech"],
  "Budynki": ["Dom mody", "Domek z kart", "Stajnia Augiasza"],
  "Zamki": ["Zamek błyskawiczny", "Zamek centralny", "Zamek z piasku"],
  "Pieniądze": ["Złoty środek", "Bank krwi", "Moneta przetargowa"],
  "Wojsko": ["Kwaśna mina", "Bomba kaloryczna", "Czołówka gazet"],
  "Ubrania": ["Płaszcz ziemski", "Rzucić rękawicę", "Czapka niewidka", "Pas Oriona", "Pas startowy"],
  "Kuchnia": ["Garnek złota", "Nóż w plecy", "Totalny czajnik"],
  "Zabawki": ["Klocek hamulcowy", "Puścić bąka", "Lalka Prusa"],
  "Imiona": ["Nocny marek", "Filip z konopi", "Zosia Samosia", "Ala ma kota"],
  "Polscy królowie": ["Król Julian", "Bolesław Prus", "Dzwon Zygmunta"],
  "Państwa": ["Państwo młodzi", "Latający Holender"],
  "Polskie miasta": ["Łódź podwodna", "Piła łańcuchowa", "Koło fortuny", "Brzeg morza", "Hel w baloniku"],
  "Wyspy": ["Wyspa kuchenna", "Wysepka na rondzie"],
  "Góry": ["Z górki na pazurki", "Góra prania", "Góra z górą"],
  "Morza i jeziora": ["Morskie oko", "Morze możliwości", "Wisła Kraków"],
  "Święta": ["Święty spokój", "Gwiazdka z nieba"],
  "Znaki drogowe": ["Znak zodiaku", "Znak zapytania", "Skrzyżowanie gatunków", "Ślepa uliczka"],
  "Języki": ["Język spustowy", "Język w bucie", "Ugryźć się w język"],
};

export const PASSWORDS: Password[] = Object.entries(BANK).flatMap(([category, answers]) =>
  answers.map((answer) => ({ category, answer: answer.toLocaleUpperCase("pl") })),
);

/** Losuje hasło, którego nie było jeszcze w tej grze. */
export function pickPassword(used: Set<string>, rng: () => number = Math.random): Password {
  const fresh = PASSWORDS.filter((p) => !used.has(p.answer));
  const pool = fresh.length > 0 ? fresh : PASSWORDS;
  return pool[Math.floor(rng() * pool.length)];
}
