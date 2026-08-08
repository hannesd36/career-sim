import { CLUB_BY_ID } from './clubs'
import { fold, p, type Legend } from './legend'
import { HONOUR_PATCH, MORE_LEGENDS } from './legends2'
import { NATION_BY_NAME, type Confederation } from './nations'

/**
 * The names the quiz games are played with.
 *
 * Everything in here is the kind of fact a pub argument turns on: who someone
 * played for, where they are from, what they won. Nothing is invented and
 * nothing is simulated: the career simulator makes its own people up, and
 * these are the real ones you are asked to remember.
 *
 * The book comes in two halves. This file holds the men everybody names first.
 * `legends2.ts` holds the several hundred behind them, so a current squad list,
 * a Bundesliga bench and a nineties World Cup are all in the same book. The
 * shape both halves are written to is in `legend.ts`.
 */
export { HONOURS } from './legend'
export { fold }
export type { Honour, Legend } from './legend'

// prettier-ignore
const CORE: Legend[] = [
  // ---------------------------------------------------------------- Argentina
  p('Lionel Messi', 'Argentina', 'RW', 1987, 'esp1-barcelona fra1-paris-saint-germain usa1-inter-miami', ['ucl', 'worldcup', 'copa', 'ballondor', 'goldenshoe'], { alt: ['Leo Messi', 'La Pulga'] }),
  p('Ángel Di María', 'Argentina', 'RW', 1988, 'esp1-real-madrid eng1-manchester-united fra1-paris-saint-germain ita1-juventus por1-benfica arg1-rosario-central', ['ucl', 'worldcup', 'copa'], { alt: ['Fideo'] }),
  p('Emiliano Martínez', 'Argentina', 'GK', 1992, 'eng1-arsenal eng1-aston-villa', ['worldcup', 'copa'], { alt: ['Dibu Martinez'] }),
  p('Julián Álvarez', 'Argentina', 'ST', 2000, 'arg1-river-plate eng1-manchester-city esp1-atletico-madrid', ['ucl', 'worldcup', 'copa'], { alt: ['La Araña'] }),
  p('Lautaro Martínez', 'Argentina', 'ST', 1997, 'arg1-racing-club ita1-inter-milan', ['worldcup', 'copa'], { alt: ['El Toro'] }),
  p('Rodrigo De Paul', 'Argentina', 'CM', 1994, 'arg1-racing-club esp1-valencia ita1-udinese esp1-atletico-madrid usa1-inter-miami', ['worldcup', 'copa']),
  p('Enzo Fernández', 'Argentina', 'CM', 2001, 'arg1-river-plate por1-benfica eng1-chelsea', ['worldcup']),
  p('Alexis Mac Allister', 'Argentina', 'CM', 1998, 'arg1-argentinos-juniors eng1-brighton eng1-liverpool', ['worldcup']),
  p('Cristian Romero', 'Argentina', 'CB', 1998, 'ita1-genoa ita1-atalanta eng1-tottenham-hotspur', ['worldcup', 'copa'], { alt: ['Cuti Romero'] }),
  p('Nicolás Otamendi', 'Argentina', 'CB', 1988, 'arg1-velez-sarsfield por1-fc-porto esp1-valencia eng1-manchester-city por1-benfica', ['worldcup', 'copa']),
  p('Nahuel Molina', 'Argentina', 'RB', 1998, 'arg1-boca-juniors ita1-udinese esp1-atletico-madrid', ['worldcup']),
  p('Giovani Lo Celso', 'Argentina', 'CM', 1996, 'arg1-rosario-central fra1-paris-saint-germain esp1-real-betis eng1-tottenham-hotspur', ['worldcup']),
  p('Paulo Dybala', 'Argentina', 'CAM', 1993, 'ita2-palermo ita1-juventus ita1-roma', ['worldcup'], { alt: ['La Joya'] }),
  p('Sergio Agüero', 'Argentina', 'ST', 1988, 'arg1-independiente esp1-atletico-madrid eng1-manchester-city esp1-barcelona', ['europa', 'copa', 'goldenboy'], { retired: true, alt: ['Kun Aguero'] }),
  p('Gonzalo Higuaín', 'Argentina', 'ST', 1987, 'arg1-river-plate esp1-real-madrid ita1-napoli ita1-juventus ita1-ac-milan eng1-chelsea usa1-inter-miami', [], { retired: true, alt: ['Pipita'] }),
  p('Javier Mascherano', 'Argentina', 'CDM', 1984, 'arg1-river-plate bra1-corinthians eng1-west-ham-united eng1-liverpool esp1-barcelona', ['ucl'], { retired: true, alt: ['Jefecito'] }),
  p('Carlos Tevez', 'Argentina', 'ST', 1984, 'arg1-boca-juniors bra1-corinthians eng1-west-ham-united eng1-manchester-united eng1-manchester-city ita1-juventus', ['ucl', 'libertadores'], { retired: true, alt: ['Carlitos'] }),
  p('Juan Román Riquelme', 'Argentina', 'CAM', 1978, 'arg1-boca-juniors esp1-barcelona esp1-villarreal', ['libertadores'], { retired: true, alt: ['Roman Riquelme'] }),
  p('Diego Maradona', 'Argentina', 'CAM', 1960, 'arg1-boca-juniors esp1-barcelona ita1-napoli esp1-sevilla arg1-newells-old-boys', ['worldcup'], { retired: true, alt: ['El Diego', 'D10S'] }),
  p('Franco Mastantuono', 'Argentina', 'CAM', 2007, 'arg1-river-plate esp1-real-madrid'),

  // ------------------------------------------------------------------- Brazil
  p('Neymar', 'Brazil', 'LW', 1992, 'bra1-santos esp1-barcelona fra1-paris-saint-germain ksa1-al-hilal bra1-santos', ['ucl', 'libertadores'], { alt: ['Neymar Junior', 'Ney'] }),
  p('Vinícius Júnior', 'Brazil', 'LW', 2000, 'bra1-flamengo esp1-real-madrid', ['ucl'], { alt: ['Vini Jr', 'Vinicius'] }),
  p('Rodrygo', 'Brazil', 'RW', 2001, 'bra1-santos esp1-real-madrid', ['ucl'], { alt: ['Rodrygo Goes'] }),
  p('Casemiro', 'Brazil', 'CDM', 1992, 'bra1-sao-paulo esp1-real-madrid eng1-manchester-united', ['ucl', 'copa']),
  p('Alisson', 'Brazil', 'GK', 1992, 'bra1-internacional ita1-roma eng1-liverpool', ['ucl', 'copa'], { alt: ['Alisson Becker'] }),
  p('Ederson', 'Brazil', 'GK', 1993, 'por1-benfica eng1-manchester-city tur1-fenerbahce', ['ucl', 'copa'], { alt: ['Ederson Moraes'] }),
  p('Marquinhos', 'Brazil', 'CB', 1994, 'bra1-corinthians ita1-roma fra1-paris-saint-germain', ['ucl', 'copa']),
  p('Thiago Silva', 'Brazil', 'CB', 1984, 'bra1-fluminense ita1-ac-milan fra1-paris-saint-germain eng1-chelsea bra1-fluminense', ['ucl', 'copa'], { alt: ['O Monstro'] }),
  p('Éder Militão', 'Brazil', 'CB', 1998, 'bra1-sao-paulo por1-fc-porto esp1-real-madrid', ['ucl']),
  p('Raphinha', 'Brazil', 'RW', 1996, 'por1-vitoria-guimaraes por1-sporting-cp fra1-rennes eng1-leeds-united esp1-barcelona', ['copa']),
  p('Richarlison', 'Brazil', 'ST', 1997, 'bra1-fluminense eng2-watford eng1-everton eng1-tottenham-hotspur', ['copa']),
  p('Gabriel Jesus', 'Brazil', 'ST', 1997, 'bra1-palmeiras eng1-manchester-city eng1-arsenal', ['copa']),
  p('Gabriel Magalhães', 'Brazil', 'CB', 1997, 'fra1-lille eng1-arsenal', [], { alt: ['Gabriel Gavião'] }),
  p('Bruno Guimarães', 'Brazil', 'CM', 1997, 'fra1-lyon eng1-newcastle-united'),
  p('Philippe Coutinho', 'Brazil', 'CAM', 1992, 'ita1-inter-milan eng1-liverpool esp1-barcelona ger1-bayern-munich eng1-aston-villa bra1-vasco-da-gama', ['ucl', 'copa'], { alt: ['O Magico'] }),
  p('Fabinho', 'Brazil', 'CDM', 1993, 'fra1-monaco eng1-liverpool ksa1-al-ittihad', ['ucl']),
  p('Roberto Firmino', 'Brazil', 'ST', 1991, 'ger1-hoffenheim eng1-liverpool ksa1-al-ahli', ['ucl', 'copa'], { alt: ['Bobby Firmino'] }),
  p('Endrick', 'Brazil', 'ST', 2006, 'bra1-palmeiras esp1-real-madrid'),
  p('Estêvão', 'Brazil', 'RW', 2007, 'bra1-palmeiras eng1-chelsea', [], { alt: ['Estevao Willian', 'Messinho'] }),
  p('Marcelo', 'Brazil', 'LB', 1988, 'bra1-fluminense esp1-real-madrid gre1-olympiacos bra1-fluminense', ['ucl'], { retired: true, alt: ['Marcelo Vieira'] }),
  p('Ronaldo Nazário', 'Brazil', 'ST', 1976, 'bra1-cruzeiro ned1-psv esp1-barcelona ita1-inter-milan esp1-real-madrid ita1-ac-milan bra1-corinthians', ['europa', 'worldcup', 'copa', 'ballondor', 'goldenshoe'], { retired: true, alt: ['Ronaldo', 'O Fenomeno', 'R9'] }),
  p('Ronaldinho', 'Brazil', 'CAM', 1980, 'bra1-gremio fra1-paris-saint-germain esp1-barcelona ita1-ac-milan bra1-flamengo bra1-atletico-mineiro', ['ucl', 'libertadores', 'worldcup', 'copa', 'ballondor'], { retired: true, alt: ['Ronaldinho Gaucho', 'Dinho'] }),
  p('Kaká', 'Brazil', 'CAM', 1982, 'bra1-sao-paulo ita1-ac-milan esp1-real-madrid usa1-orlando-city', ['ucl', 'worldcup', 'ballondor'], { retired: true, alt: ['Ricardo Kaka'] }),
  p('Roberto Carlos', 'Brazil', 'LB', 1973, 'bra1-palmeiras ita1-inter-milan esp1-real-madrid tur1-fenerbahce', ['ucl', 'worldcup'], { retired: true }),
  p('Cafu', 'Brazil', 'RB', 1970, 'bra1-sao-paulo ita1-roma ita1-ac-milan', ['ucl', 'worldcup', 'copa'], { retired: true }),

  // ----------------------------------------------------------------- Portugal
  p('Cristiano Ronaldo', 'Portugal', 'ST', 1985, 'por1-sporting-cp eng1-manchester-united esp1-real-madrid ita1-juventus eng1-manchester-united ksa1-al-nassr', ['ucl', 'euro', 'ballondor', 'goldenshoe'], { alt: ['CR7', 'Ronaldo'] }),
  p('Bruno Fernandes', 'Portugal', 'CAM', 1994, 'ita1-udinese ita2-sampdoria por1-sporting-cp eng1-manchester-united'),
  p('Bernardo Silva', 'Portugal', 'CAM', 1994, 'por1-benfica fra1-monaco eng1-manchester-city', ['ucl']),
  p('Rúben Dias', 'Portugal', 'CB', 1997, 'por1-benfica eng1-manchester-city', ['ucl']),
  p('João Félix', 'Portugal', 'ST', 1999, 'por1-benfica esp1-atletico-madrid eng1-chelsea esp1-barcelona ksa1-al-nassr', ['goldenboy']),
  p('Rafael Leão', 'Portugal', 'LW', 1999, 'por1-sporting-cp fra1-lille ita1-ac-milan'),
  p('Vitinha', 'Portugal', 'CM', 2000, 'por1-fc-porto eng1-wolverhampton-wanderers fra1-paris-saint-germain', ['ucl']),
  p('João Cancelo', 'Portugal', 'RB', 1994, 'por1-benfica esp1-valencia ita1-inter-milan ita1-juventus eng1-manchester-city ger1-bayern-munich esp1-barcelona ksa1-al-hilal'),
  p('Nuno Mendes', 'Portugal', 'LB', 2002, 'por1-sporting-cp fra1-paris-saint-germain', ['ucl']),
  p('Gonçalo Ramos', 'Portugal', 'ST', 2001, 'por1-benfica fra1-paris-saint-germain', ['ucl']),
  p('Rúben Neves', 'Portugal', 'CDM', 1997, 'por1-fc-porto eng1-wolverhampton-wanderers ksa1-al-hilal'),
  p('Diogo Costa', 'Portugal', 'GK', 1999, 'por1-fc-porto'),
  p('Pepe', 'Portugal', 'CB', 1983, 'por1-fc-porto esp1-real-madrid tur1-besiktas por1-fc-porto', ['ucl', 'euro'], { retired: true }),
  p('Luís Figo', 'Portugal', 'RW', 1972, 'por1-sporting-cp esp1-barcelona esp1-real-madrid ita1-inter-milan', ['ucl', 'ballondor'], { retired: true }),
  p('Deco', 'Portugal', 'CAM', 1977, 'por1-fc-porto esp1-barcelona eng1-chelsea bra1-fluminense', ['ucl'], { retired: true }),

  // ------------------------------------------------------------------- France
  p('Kylian Mbappé', 'France', 'ST', 1998, 'fra1-monaco fra1-paris-saint-germain esp1-real-madrid', ['worldcup', 'goldenshoe'], { alt: ['Kylian Mbappe', 'Donatello'] }),
  p('Antoine Griezmann', 'France', 'ST', 1991, 'esp1-real-sociedad esp1-atletico-madrid esp1-barcelona esp1-atletico-madrid', ['europa', 'worldcup'], { alt: ['Grizi'] }),
  p("N'Golo Kanté", 'France', 'CDM', 1991, 'eng2-leicester-city eng1-chelsea ksa1-al-ittihad', ['ucl', 'europa', 'worldcup'], { alt: ['NGolo Kante'] }),
  p('Ousmane Dembélé', 'France', 'RW', 1997, 'fra1-rennes ger1-borussia-dortmund esp1-barcelona fra1-paris-saint-germain', ['ucl', 'worldcup', 'ballondor'], { alt: ['Dembouz'] }),
  p('Kingsley Coman', 'France', 'LW', 1996, 'fra1-paris-saint-germain ita1-juventus ger1-bayern-munich ksa1-al-nassr', ['ucl', 'worldcup']),
  p('Aurélien Tchouaméni', 'France', 'CDM', 2000, 'fra1-monaco esp1-real-madrid', ['ucl']),
  p('Eduardo Camavinga', 'France', 'CM', 2002, 'fra1-rennes esp1-real-madrid', ['ucl']),
  p('Théo Hernández', 'France', 'LB', 1997, 'esp1-atletico-madrid esp1-real-madrid ita1-ac-milan ksa1-al-hilal', [], { alt: ['Theo Hernandez'] }),
  p('Lucas Hernández', 'France', 'CB', 1996, 'esp1-atletico-madrid ger1-bayern-munich fra1-paris-saint-germain', ['ucl', 'europa', 'worldcup']),
  p('Mike Maignan', 'France', 'GK', 1995, 'fra1-paris-saint-germain fra1-lille ita1-ac-milan', [], { alt: ['Magic Mike'] }),
  p('Hugo Lloris', 'France', 'GK', 1986, 'fra1-nice fra1-lyon eng1-tottenham-hotspur usa1-los-angeles-fc', ['worldcup']),
  p('Karim Benzema', 'France', 'ST', 1987, 'fra1-lyon esp1-real-madrid ksa1-al-ittihad', ['ucl', 'ballondor'], { alt: ['KB9'] }),
  p('Paul Pogba', 'France', 'CM', 1993, 'ita1-juventus eng1-manchester-united ita1-juventus fra1-monaco', ['europa', 'worldcup', 'goldenboy'], { alt: ['La Pioche'] }),
  p('Olivier Giroud', 'France', 'ST', 1986, 'fra2-montpellier eng1-arsenal eng1-chelsea ita1-ac-milan usa1-los-angeles-fc fra1-lille', ['ucl', 'europa', 'worldcup']),
  p('William Saliba', 'France', 'CB', 2001, 'fra2-saint-etienne eng1-arsenal fra1-marseille eng1-arsenal'),
  p('Michael Olise', 'France', 'RW', 2001, 'eng1-crystal-palace ger1-bayern-munich'),
  p('Désiré Doué', 'France', 'CAM', 2005, 'fra1-rennes fra1-paris-saint-germain', ['ucl'], { alt: ['Desire Doue'] }),
  p('Bradley Barcola', 'France', 'LW', 2002, 'fra1-lyon fra1-paris-saint-germain', ['ucl']),
  p('Randal Kolo Muani', 'France', 'ST', 1998, 'fra1-nantes ger1-eintracht-frankfurt fra1-paris-saint-germain ita1-juventus'),
  p('Marcus Thuram', 'France', 'ST', 1997, 'fra2-guingamp ger1-borussia-monchengladbach ita1-inter-milan'),
  p('Zinedine Zidane', 'France', 'CAM', 1972, 'ita1-juventus esp1-real-madrid', ['ucl', 'worldcup', 'euro', 'ballondor'], { retired: true, alt: ['Zizou'] }),
  p('Thierry Henry', 'France', 'ST', 1977, 'fra1-monaco ita1-juventus eng1-arsenal esp1-barcelona usa1-new-york-red-bulls', ['ucl', 'worldcup', 'euro', 'goldenshoe'], { retired: true, alt: ['Titi'] }),
  p('Franck Ribéry', 'France', 'LW', 1983, 'fra1-marseille ger1-bayern-munich ita1-fiorentina', ['ucl'], { retired: true }),
  p('Patrick Vieira', 'France', 'CM', 1976, 'ita1-ac-milan eng1-arsenal ita1-juventus ita1-inter-milan eng1-manchester-city', ['worldcup', 'euro'], { retired: true }),

  // -------------------------------------------------------------------- Spain
  p('Lamine Yamal', 'Spain', 'RW', 2007, 'esp1-barcelona', ['euro', 'goldenboy']),
  p('Pedri', 'Spain', 'CM', 2002, 'esp2-las-palmas esp1-barcelona', ['euro', 'goldenboy'], { alt: ['Pedro Gonzalez Lopez'] }),
  p('Gavi', 'Spain', 'CM', 2004, 'esp1-barcelona', ['euro', 'goldenboy'], { alt: ['Pablo Gavira'] }),
  p('Rodri', 'Spain', 'CDM', 1996, 'esp1-villarreal esp1-atletico-madrid eng1-manchester-city', ['ucl', 'euro', 'ballondor'], { alt: ['Rodri Hernandez'] }),
  p('Álvaro Morata', 'Spain', 'ST', 1992, 'esp1-real-madrid ita1-juventus eng1-chelsea esp1-atletico-madrid ita1-ac-milan tur1-galatasaray ita1-como', ['ucl', 'euro']),
  p('Dani Olmo', 'Spain', 'CAM', 1998, 'ger1-rb-leipzig esp1-barcelona', ['euro']),
  p('Nico Williams', 'Spain', 'LW', 2002, 'esp1-athletic-bilbao', ['euro']),
  p('Mikel Oyarzabal', 'Spain', 'LW', 1997, 'esp1-real-sociedad', ['euro']),
  p('Unai Simón', 'Spain', 'GK', 1997, 'esp1-athletic-bilbao', ['euro']),
  p('Martín Zubimendi', 'Spain', 'CDM', 1999, 'esp1-real-sociedad eng1-arsenal', ['euro']),
  p('Ferran Torres', 'Spain', 'ST', 2000, 'esp1-valencia eng1-manchester-city esp1-barcelona', ['euro']),
  p('Fabián Ruiz', 'Spain', 'CM', 1996, 'esp1-real-betis ita1-napoli fra1-paris-saint-germain', ['ucl', 'euro']),
  p('Mikel Merino', 'Spain', 'CM', 1996, 'esp1-osasuna ger1-borussia-dortmund eng1-newcastle-united esp1-real-sociedad eng1-arsenal', ['euro']),
  p('Marc Cucurella', 'Spain', 'LB', 1998, 'esp1-barcelona esp1-getafe eng1-brighton eng1-chelsea', ['euro']),
  p('Marc-André ter Stegen', 'Germany', 'GK', 1992, 'ger1-borussia-monchengladbach esp1-barcelona', ['ucl'], { alt: ['Ter Stegen'] }),
  p('David de Gea', 'Spain', 'GK', 1990, 'esp1-atletico-madrid eng1-manchester-united ita1-fiorentina', ['europa']),
  p('Sergio Ramos', 'Spain', 'CB', 1986, 'esp1-sevilla esp1-real-madrid fra1-paris-saint-germain esp1-sevilla mex1-monterrey', ['ucl', 'worldcup', 'euro'], { alt: ['SR4'] }),
  p('Iker Casillas', 'Spain', 'GK', 1981, 'esp1-real-madrid por1-fc-porto', ['ucl', 'worldcup', 'euro'], { retired: true, alt: ['San Iker'] }),
  p('Xavi', 'Spain', 'CM', 1980, 'esp1-barcelona', ['ucl', 'worldcup', 'euro'], { retired: true, alt: ['Xavi Hernandez'] }),
  p('Andrés Iniesta', 'Spain', 'CM', 1984, 'esp1-barcelona', ['ucl', 'worldcup', 'euro'], { retired: true, alt: ['Don Andres'] }),
  p('Sergio Busquets', 'Spain', 'CDM', 1988, 'esp1-barcelona usa1-inter-miami', ['ucl', 'worldcup', 'euro'], { retired: true }),
  p('Gerard Piqué', 'Spain', 'CB', 1987, 'eng1-manchester-united esp1-barcelona', ['ucl', 'worldcup', 'euro'], { retired: true }),
  p('Xabi Alonso', 'Spain', 'CM', 1981, 'esp1-real-sociedad eng1-liverpool esp1-real-madrid ger1-bayern-munich', ['ucl', 'worldcup', 'euro'], { retired: true }),
  p('David Villa', 'Spain', 'ST', 1981, 'esp2-sporting-gijon esp2-real-zaragoza esp1-valencia esp1-barcelona esp1-atletico-madrid usa1-new-york-city-fc', ['ucl', 'worldcup', 'euro'], { retired: true, alt: ['El Guaje'] }),
  p('Fernando Torres', 'Spain', 'ST', 1984, 'esp1-atletico-madrid eng1-liverpool eng1-chelsea ita1-ac-milan esp1-atletico-madrid', ['ucl', 'europa', 'worldcup', 'euro'], { retired: true, alt: ['El Nino'] }),
  p('Raúl', 'Spain', 'ST', 1977, 'esp1-real-madrid ger2-schalke-04', ['ucl'], { retired: true, alt: ['Raul Gonzalez'] }),

  // ------------------------------------------------------------------ England
  p('Harry Kane', 'England', 'ST', 1993, 'eng1-tottenham-hotspur ger1-bayern-munich', [], { alt: ['Hurricane'] }),
  p('Jude Bellingham', 'England', 'CM', 2003, 'eng2-birmingham-city ger1-borussia-dortmund esp1-real-madrid', ['ucl', 'goldenboy']),
  p('Phil Foden', 'England', 'CAM', 2000, 'eng1-manchester-city', ['ucl'], { alt: ['Stockport Iniesta'] }),
  p('Bukayo Saka', 'England', 'RW', 2001, 'eng1-arsenal', [], { alt: ['Starboy'] }),
  p('Declan Rice', 'England', 'CDM', 1999, 'eng1-west-ham-united eng1-arsenal'),
  p('Cole Palmer', 'England', 'CAM', 2002, 'eng1-manchester-city eng1-chelsea', ['ucl'], { alt: ['Cold Palmer'] }),
  p('Jordan Pickford', 'England', 'GK', 1994, 'eng1-sunderland eng1-everton'),
  p('Kyle Walker', 'England', 'RB', 1990, 'eng1-tottenham-hotspur eng1-manchester-city ita1-ac-milan eng1-burnley', ['ucl']),
  p('John Stones', 'England', 'CB', 1994, 'eng1-everton eng1-manchester-city', ['ucl']),
  p('Marcus Rashford', 'England', 'LW', 1997, 'eng1-manchester-united eng1-aston-villa esp1-barcelona', ['europa']),
  p('Raheem Sterling', 'England', 'LW', 1994, 'eng1-liverpool eng1-manchester-city eng1-chelsea eng1-arsenal'),
  p('Jack Grealish', 'England', 'LW', 1995, 'eng1-aston-villa eng1-manchester-city eng1-everton', ['ucl']),
  p('Trent Alexander-Arnold', 'England', 'RB', 1998, 'eng1-liverpool esp1-real-madrid', ['ucl'], { alt: ['TAA'] }),
  p('Mason Mount', 'England', 'CAM', 1999, 'eng1-chelsea eng1-manchester-united', ['ucl']),
  p('Reece James', 'England', 'RB', 1999, 'eng1-chelsea', ['ucl']),
  p('Eberechi Eze', 'England', 'CAM', 1998, 'eng2-queens-park-rangers eng1-crystal-palace eng1-arsenal'),
  p('Steven Gerrard', 'England', 'CM', 1980, 'eng1-liverpool usa1-la-galaxy', ['ucl', 'europa'], { retired: true, alt: ['Stevie G'] }),
  p('Frank Lampard', 'England', 'CM', 1978, 'eng1-west-ham-united eng1-chelsea eng1-manchester-city usa1-new-york-city-fc', ['ucl', 'europa'], { retired: true }),
  p('David Beckham', 'England', 'RW', 1975, 'eng1-manchester-united esp1-real-madrid usa1-la-galaxy ita1-ac-milan fra1-paris-saint-germain', ['ucl'], { retired: true, alt: ['Becks'] }),
  p('Wayne Rooney', 'England', 'ST', 1985, 'eng1-everton eng1-manchester-united usa1-dc-united eng2-derby-county', ['ucl', 'europa'], { retired: true, alt: ['Wazza'] }),
  p('Rio Ferdinand', 'England', 'CB', 1978, 'eng1-west-ham-united eng1-leeds-united eng1-manchester-united eng2-queens-park-rangers', ['ucl'], { retired: true }),
  p('Paul Scholes', 'England', 'CM', 1974, 'eng1-manchester-united', ['ucl'], { retired: true }),
  p('Michael Owen', 'England', 'ST', 1979, 'eng1-liverpool esp1-real-madrid eng1-newcastle-united eng1-manchester-united eng2-stoke-city', ['europa', 'ballondor'], { retired: true }),
  p('Alan Shearer', 'England', 'ST', 1970, 'eng2-southampton eng2-blackburn-rovers eng1-newcastle-united', [], { retired: true }),

  // ------------------------------------------------------------------ Germany
  p('Manuel Neuer', 'Germany', 'GK', 1986, 'ger2-schalke-04 ger1-bayern-munich', ['ucl', 'worldcup']),
  p('Thomas Müller', 'Germany', 'CAM', 1989, 'ger1-bayern-munich usa1-vancouver-whitecaps', ['ucl', 'worldcup'], { alt: ['Raumdeuter'] }),
  p('Joshua Kimmich', 'Germany', 'CM', 1995, 'ger1-vfb-stuttgart ger1-rb-leipzig ger1-bayern-munich', ['ucl']),
  p('Florian Wirtz', 'Germany', 'CAM', 2003, 'ger1-fc-koln ger1-bayer-leverkusen eng1-liverpool'),
  p('Jamal Musiala', 'Germany', 'CAM', 2003, 'ger1-bayern-munich', [], { alt: ['Bambi'] }),
  p('Kai Havertz', 'Germany', 'CAM', 1999, 'ger1-bayer-leverkusen eng1-chelsea eng1-arsenal', ['ucl']),
  p('Antonio Rüdiger', 'Germany', 'CB', 1993, 'ger1-vfb-stuttgart ita1-roma eng1-chelsea esp1-real-madrid', ['ucl', 'europa']),
  p('İlkay Gündoğan', 'Germany', 'CM', 1990, 'ger2-nurnberg ger1-borussia-dortmund eng1-manchester-city esp1-barcelona eng1-manchester-city', ['ucl'], { alt: ['Ilkay Gundogan'] }),
  p('Leroy Sané', 'Germany', 'LW', 1996, 'ger2-schalke-04 eng1-manchester-city ger1-bayern-munich tur1-galatasaray'),
  p('Serge Gnabry', 'Germany', 'RW', 1995, 'eng1-arsenal ger1-werder-bremen ger1-hoffenheim ger1-bayern-munich', ['ucl']),
  p('Jonathan Tah', 'Germany', 'CB', 1996, 'ger1-hamburg ger1-bayer-leverkusen ger1-bayern-munich'),
  p('Nick Woltemade', 'Germany', 'ST', 2002, 'ger1-werder-bremen ger1-vfb-stuttgart eng1-newcastle-united'),
  p('Niclas Füllkrug', 'Germany', 'ST', 1993, 'ger2-hannover-96 ger1-werder-bremen ger1-borussia-dortmund eng1-west-ham-united', [], { alt: ['Fullkrug', 'Lücke'] }),
  p('Marco Reus', 'Germany', 'CAM', 1989, 'ger1-borussia-monchengladbach ger1-borussia-dortmund usa1-los-angeles-fc'),
  p('Toni Kroos', 'Germany', 'CM', 1990, 'ger1-bayern-munich ger1-bayer-leverkusen esp1-real-madrid', ['ucl', 'worldcup'], { retired: true }),
  p('Philipp Lahm', 'Germany', 'RB', 1983, 'ger1-bayern-munich ger1-vfb-stuttgart ger1-bayern-munich', ['ucl', 'worldcup'], { retired: true }),
  p('Bastian Schweinsteiger', 'Germany', 'CM', 1984, 'ger1-bayern-munich eng1-manchester-united usa1-chicago-fire', ['ucl', 'worldcup'], { retired: true, alt: ['Schweini'] }),
  p('Miroslav Klose', 'Germany', 'ST', 1978, 'ger2-kaiserslautern ger1-werder-bremen ger1-bayern-munich ita1-lazio', ['worldcup'], { retired: true }),
  p('Mesut Özil', 'Germany', 'CAM', 1988, 'ger2-schalke-04 ger1-werder-bremen esp1-real-madrid eng1-arsenal tur1-fenerbahce tur1-istanbul-basaksehir', ['worldcup'], { retired: true, alt: ['Mesut Ozil'] }),
  p('Michael Ballack', 'Germany', 'CM', 1976, 'ger2-kaiserslautern ger1-bayer-leverkusen ger1-bayern-munich eng1-chelsea', [], { retired: true }),
  p('Oliver Kahn', 'Germany', 'GK', 1969, 'ger2-karlsruher-sc ger1-bayern-munich', ['ucl'], { retired: true, alt: ['Der Titan'] }),

  // -------------------------------------------------------------- Netherlands
  p('Virgil van Dijk', 'Netherlands', 'CB', 1991, 'ned1-groningen sco1-celtic eng2-southampton eng1-liverpool', ['ucl']),
  p('Frenkie de Jong', 'Netherlands', 'CM', 1997, 'ned1-ajax esp1-barcelona'),
  p('Memphis Depay', 'Netherlands', 'ST', 1994, 'ned1-psv eng1-manchester-united fra1-lyon esp1-barcelona esp1-atletico-madrid bra1-corinthians', [], { alt: ['Memphis'] }),
  p('Cody Gakpo', 'Netherlands', 'LW', 1999, 'ned1-psv eng1-liverpool'),
  p('Matthijs de Ligt', 'Netherlands', 'CB', 1999, 'ned1-ajax ita1-juventus ger1-bayern-munich eng1-manchester-united', ['goldenboy']),
  p('Ryan Gravenberch', 'Netherlands', 'CM', 2002, 'ned1-ajax ger1-bayern-munich eng1-liverpool'),
  p('Tijjani Reijnders', 'Netherlands', 'CM', 1998, 'ned1-az-alkmaar ita1-ac-milan eng1-manchester-city'),
  p('Denzel Dumfries', 'Netherlands', 'RB', 1996, 'ned1-sparta-rotterdam ned1-heerenveen ned1-psv ita1-inter-milan'),
  p('Nathan Aké', 'Netherlands', 'CB', 1995, 'eng1-chelsea eng1-bournemouth eng1-manchester-city', ['ucl']),
  p('Wout Weghorst', 'Netherlands', 'ST', 1992, 'ned1-heerenveen ned1-az-alkmaar ger1-wolfsburg eng1-burnley eng1-manchester-united tur1-besiktas ned1-ajax'),
  p('Xavi Simons', 'Netherlands', 'CAM', 2003, 'fra1-paris-saint-germain ned1-psv ger1-rb-leipzig eng1-tottenham-hotspur'),
  p('Arjen Robben', 'Netherlands', 'RW', 1984, 'ned1-groningen ned1-psv eng1-chelsea esp1-real-madrid ger1-bayern-munich ned1-groningen', ['ucl'], { retired: true }),
  p('Robin van Persie', 'Netherlands', 'ST', 1983, 'ned1-feyenoord eng1-arsenal eng1-manchester-united tur1-fenerbahce ned1-feyenoord', [], { retired: true, alt: ['RVP'] }),
  p('Wesley Sneijder', 'Netherlands', 'CAM', 1984, 'ned1-ajax esp1-real-madrid ita1-inter-milan tur1-galatasaray fra1-nice', ['ucl'], { retired: true }),
  p('Ruud van Nistelrooy', 'Netherlands', 'ST', 1976, 'ned1-heerenveen ned1-psv eng1-manchester-united esp1-real-madrid ger1-hamburg', [], { retired: true, alt: ['Van Gol'] }),
  p('Dennis Bergkamp', 'Netherlands', 'ST', 1969, 'ned1-ajax ita1-inter-milan eng1-arsenal', ['europa'], { retired: true, alt: ['The Iceman'] }),
  p('Clarence Seedorf', 'Netherlands', 'CM', 1976, 'ned1-ajax esp1-real-madrid ita2-sampdoria ita1-inter-milan ita1-ac-milan bra1-botafogo', ['ucl'], { retired: true }),
  p('Edwin van der Sar', 'Netherlands', 'GK', 1970, 'ned1-ajax ita1-juventus eng1-fulham eng1-manchester-united', ['ucl'], { retired: true }),

  // ------------------------------------------------------------------ Belgium
  p('Kevin De Bruyne', 'Belgium', 'CAM', 1991, 'bel1-genk eng1-chelsea ger1-werder-bremen ger1-wolfsburg eng1-manchester-city ita1-napoli', ['ucl'], { alt: ['KDB'] }),
  p('Romelu Lukaku', 'Belgium', 'ST', 1993, 'bel1-anderlecht eng1-chelsea eng1-everton eng1-manchester-united ita1-inter-milan eng1-chelsea ita1-roma ita1-napoli', ['europa'], { alt: ['Big Rom'] }),
  p('Thibaut Courtois', 'Belgium', 'GK', 1992, 'bel1-genk esp1-atletico-madrid eng1-chelsea esp1-real-madrid', ['ucl', 'europa']),
  p('Jérémy Doku', 'Belgium', 'LW', 2002, 'bel1-anderlecht fra1-rennes eng1-manchester-city'),
  p('Youri Tielemans', 'Belgium', 'CM', 1997, 'bel1-anderlecht fra1-monaco eng2-leicester-city eng1-aston-villa'),
  p('Eden Hazard', 'Belgium', 'LW', 1991, 'fra1-lille eng1-chelsea esp1-real-madrid', ['ucl', 'europa'], { retired: true }),

  // -------------------------------------------------------------------- Italy
  p('Gianluigi Donnarumma', 'Italy', 'GK', 1999, 'ita1-ac-milan fra1-paris-saint-germain eng1-manchester-city', ['ucl', 'euro'], { alt: ['Gigio'] }),
  p('Federico Chiesa', 'Italy', 'RW', 1997, 'ita1-fiorentina ita1-juventus eng1-liverpool', ['euro']),
  p('Nicolò Barella', 'Italy', 'CM', 1997, 'ita1-cagliari ita1-inter-milan', ['euro']),
  p('Alessandro Bastoni', 'Italy', 'CB', 1999, 'ita1-atalanta ita1-inter-milan', ['euro']),
  p('Federico Dimarco', 'Italy', 'LB', 1997, 'ita1-inter-milan ita1-parma sui1-sion ita1-hellas-verona ita1-inter-milan', ['euro']),
  p('Sandro Tonali', 'Italy', 'CM', 2000, 'ita1-ac-milan eng1-newcastle-united'),
  p('Moise Kean', 'Italy', 'ST', 2000, 'ita1-juventus eng1-everton fra1-paris-saint-germain ita1-fiorentina'),
  p('Marco Verratti', 'Italy', 'CM', 1992, 'ita2-pescara fra1-paris-saint-germain', ['euro'], { alt: ['Il Gufetto'] }),
  p('Leonardo Bonucci', 'Italy', 'CB', 1987, 'ita1-inter-milan ita1-juventus ita1-ac-milan ita1-juventus ger1-union-berlin', ['euro'], { retired: true }),
  p('Giorgio Chiellini', 'Italy', 'CB', 1984, 'ita1-juventus usa1-los-angeles-fc', ['euro'], { retired: true }),
  p('Gianluigi Buffon', 'Italy', 'GK', 1978, 'ita1-parma ita1-juventus fra1-paris-saint-germain ita1-juventus ita1-parma', ['worldcup'], { retired: true, alt: ['Gigi Buffon'] }),
  p('Andrea Pirlo', 'Italy', 'CM', 1979, 'ita1-inter-milan ita1-ac-milan ita1-juventus usa1-new-york-city-fc', ['ucl', 'worldcup'], { retired: true, alt: ['Il Maestro'] }),
  p('Francesco Totti', 'Italy', 'CAM', 1976, 'ita1-roma', ['worldcup'], { retired: true, alt: ['Er Pupone', 'Il Capitano'] }),
  p('Paolo Maldini', 'Italy', 'CB', 1968, 'ita1-ac-milan', ['ucl'], { retired: true }),
  p('Alessandro Del Piero', 'Italy', 'ST', 1974, 'ita2-padova ita1-juventus', ['ucl', 'worldcup'], { retired: true, alt: ['Pinturicchio'] }),
  p('Fabio Cannavaro', 'Italy', 'CB', 1973, 'ita1-napoli ita1-parma ita1-inter-milan ita1-juventus esp1-real-madrid', ['worldcup', 'ballondor'], { retired: true }),

  // -------------------------------------------------- Croatia, Serbia, Poland
  p('Luka Modrić', 'Croatia', 'CM', 1985, 'eng1-tottenham-hotspur esp1-real-madrid ita1-ac-milan', ['ucl', 'ballondor'], { alt: ['Luka Modric'] }),
  p('Ivan Rakitić', 'Croatia', 'CM', 1988, 'sui1-basel ger2-schalke-04 esp1-sevilla esp1-barcelona esp1-sevilla ksa1-al-shabab', ['ucl', 'europa'], { retired: true, alt: ['Ivan Rakitic'] }),
  p('Mateo Kovačić', 'Croatia', 'CM', 1994, 'ita1-inter-milan esp1-real-madrid eng1-chelsea eng1-manchester-city', ['ucl', 'europa'], { alt: ['Mateo Kovacic'] }),
  p('Joško Gvardiol', 'Croatia', 'CB', 2002, 'ger1-rb-leipzig eng1-manchester-city', [], { alt: ['Josko Gvardiol'] }),
  p('Marcelo Brozović', 'Croatia', 'CDM', 1992, 'ita1-inter-milan ksa1-al-nassr', [], { alt: ['Marcelo Brozovic', 'Epic Brozovic'] }),
  p('Ivan Perišić', 'Croatia', 'LW', 1989, 'bel1-club-brugge ger1-borussia-dortmund ger1-wolfsburg ita1-inter-milan ger1-bayern-munich eng1-tottenham-hotspur ned1-psv', ['ucl'], { alt: ['Ivan Perisic'] }),
  p('Andrej Kramarić', 'Croatia', 'ST', 1991, 'eng2-leicester-city ger1-hoffenheim', [], { alt: ['Andrej Kramaric'] }),
  p('Mario Mandžukić', 'Croatia', 'ST', 1986, 'ger1-wolfsburg ger1-bayern-munich esp1-atletico-madrid ita1-juventus ita1-ac-milan', ['ucl'], { retired: true, alt: ['Mario Mandzukic'] }),
  p('Dušan Vlahović', 'Serbia', 'ST', 2000, 'ita1-fiorentina ita1-juventus', [], { alt: ['Dusan Vlahovic'] }),
  p('Sergej Milinković-Savić', 'Serbia', 'CM', 1995, 'bel1-genk ita1-lazio ksa1-al-hilal', [], { alt: ['Milinkovic Savic', 'Sergente'] }),
  p('Aleksandar Mitrović', 'Serbia', 'ST', 1994, 'bel1-anderlecht eng1-newcastle-united eng1-fulham ksa1-al-hilal', [], { alt: ['Aleksandar Mitrovic', 'Mitro'] }),
  p('Nemanja Vidić', 'Serbia', 'CB', 1981, 'eng1-manchester-united ita1-inter-milan', ['ucl'], { retired: true, alt: ['Nemanja Vidic'] }),
  p('Robert Lewandowski', 'Poland', 'ST', 1988, 'ger1-borussia-dortmund ger1-bayern-munich esp1-barcelona', ['ucl', 'goldenshoe'], { alt: ['Lewy'] }),
  p('Wojciech Szczęsny', 'Poland', 'GK', 1990, 'eng1-arsenal ita1-roma ita1-juventus esp1-barcelona', [], { alt: ['Wojciech Szczesny', 'Tekkers'] }),
  p('Piotr Zieliński', 'Poland', 'CM', 1994, 'ita1-udinese ita2-empoli ita1-napoli ita1-inter-milan', [], { alt: ['Piotr Zielinski'] }),

  // ------------------------------------------------------------------- Nordic
  p('Erling Haaland', 'Norway', 'ST', 2000, 'aut1-red-bull-salzburg ger1-borussia-dortmund eng1-manchester-city', ['ucl'], { alt: ['Halland', 'The Terminator'] }),
  p('Martin Ødegaard', 'Norway', 'CAM', 1998, 'esp1-real-madrid ned1-heerenveen esp1-real-sociedad eng1-arsenal', [], { alt: ['Martin Odegaard'] }),
  p('Alexander Isak', 'Sweden', 'ST', 1999, 'ger1-borussia-dortmund esp1-real-sociedad eng1-newcastle-united eng1-liverpool'),
  p('Zlatan Ibrahimović', 'Sweden', 'ST', 1981, 'ned1-ajax ita1-juventus ita1-inter-milan esp1-barcelona ita1-ac-milan fra1-paris-saint-germain eng1-manchester-united usa1-la-galaxy ita1-ac-milan', ['europa'], { retired: true, alt: ['Zlatan', 'Ibra'] }),
  p('Henrik Larsson', 'Sweden', 'ST', 1971, 'ned1-feyenoord sco1-celtic esp1-barcelona eng1-manchester-united', ['ucl'], { retired: true, alt: ['King of Kings'] }),
  p('Christian Eriksen', 'Denmark', 'CAM', 1992, 'ned1-ajax eng1-tottenham-hotspur ita1-inter-milan eng1-brentford eng1-manchester-united ger1-wolfsburg'),
  p('Rasmus Højlund', 'Denmark', 'ST', 2003, 'aut1-sturm-graz ita1-atalanta eng1-manchester-united ita1-napoli', [], { alt: ['Rasmus Hojlund'] }),
  p('Kasper Schmeichel', 'Denmark', 'GK', 1986, 'eng2-leicester-city fra1-nice sco1-celtic'),
  p('Peter Schmeichel', 'Denmark', 'GK', 1963, 'eng1-manchester-united por1-sporting-cp eng1-aston-villa eng1-manchester-city', ['ucl', 'euro'], { retired: true }),

  // ------------------------------------------------------------------- Africa
  p('Mohamed Salah', 'Egypt', 'RW', 1992, 'sui1-basel eng1-chelsea ita1-fiorentina ita1-roma eng1-liverpool', ['ucl'], { alt: ['Mo Salah', 'Egyptian King'] }),
  p('Sadio Mané', 'Senegal', 'LW', 1992, 'aut1-red-bull-salzburg eng2-southampton eng1-liverpool ger1-bayern-munich ksa1-al-nassr', ['ucl', 'afcon'], { alt: ['Sadio Mane'] }),
  p('Riyad Mahrez', 'Algeria', 'RW', 1991, 'eng2-leicester-city eng1-manchester-city ksa1-al-ahli', ['ucl', 'afcon']),
  p('Achraf Hakimi', 'Morocco', 'RB', 1998, 'esp1-real-madrid ger1-borussia-dortmund ita1-inter-milan fra1-paris-saint-germain', ['ucl']),
  p('Victor Osimhen', 'Nigeria', 'ST', 1998, 'bel1-charleroi fra1-lille ita1-napoli tur1-galatasaray'),
  p('Ademola Lookman', 'Nigeria', 'LW', 1997, 'eng1-everton ger1-rb-leipzig eng1-fulham ita1-atalanta', ['europa']),
  p('Yassine Bounou', 'Morocco', 'GK', 1991, 'esp1-atletico-madrid esp1-girona esp1-sevilla ksa1-al-hilal', ['europa'], { alt: ['Bono'] }),
  p('Édouard Mendy', 'Senegal', 'GK', 1992, 'fra1-rennes eng1-chelsea ksa1-al-ahli', ['ucl', 'afcon'], { alt: ['Edouard Mendy'] }),
  p('Kalidou Koulibaly', 'Senegal', 'CB', 1991, 'bel1-genk ita1-napoli eng1-chelsea ksa1-al-hilal', ['afcon']),
  p('Pierre-Emerick Aubameyang', 'Gabon', 'ST', 1989, 'fra2-saint-etienne ger1-borussia-dortmund eng1-arsenal esp1-barcelona eng1-chelsea fra1-marseille ksa1-al-qadsiah fra1-marseille', [], { alt: ['Auba', 'PEA'] }),
  p('Mohammed Kudus', 'Ghana', 'CAM', 2000, 'den1-nordsjaelland ned1-ajax eng1-west-ham-united eng1-tottenham-hotspur'),
  p('Samuel Eto’o', 'Cameroon', 'ST', 1981, 'esp1-real-madrid esp1-mallorca esp1-barcelona ita1-inter-milan eng1-chelsea eng1-everton tur1-antalyaspor tur1-konyaspor', ['ucl', 'afcon'], { retired: true, alt: ['Samuel Etoo'] }),
  p('Didier Drogba', 'Ivory Coast', 'ST', 1978, 'fra1-marseille eng1-chelsea tur1-galatasaray eng1-chelsea', ['ucl'], { retired: true }),
  p('Yaya Touré', 'Ivory Coast', 'CM', 1983, 'gre1-olympiacos fra1-monaco esp1-barcelona eng1-manchester-city', ['ucl', 'afcon'], { retired: true, alt: ['Yaya Toure'] }),

  // --------------------------------------------------------------------- Asia
  p('Son Heung-min', 'South Korea', 'LW', 1992, 'ger1-hamburg ger1-bayer-leverkusen eng1-tottenham-hotspur usa1-los-angeles-fc', [], { alt: ['Sonny', 'Son Heung min'] }),
  p('Takefusa Kubo', 'Japan', 'RW', 2001, 'esp1-real-madrid esp1-mallorca esp1-villarreal esp1-getafe esp1-real-sociedad', [], { alt: ['Take Kubo'] }),
  p('Kaoru Mitoma', 'Japan', 'LW', 1997, 'bel1-union-saint-gilloise eng1-brighton'),
  p('Wataru Endo', 'Japan', 'CDM', 1993, 'ger1-vfb-stuttgart eng1-liverpool'),

  // ---------------------------------------------------------------- Americas
  p('Christian Pulisic', 'USA', 'RW', 1998, 'ger1-borussia-dortmund eng1-chelsea ita1-ac-milan', ['ucl'], { alt: ['Captain America'] }),
  p('Weston McKennie', 'USA', 'CM', 1998, 'ger2-schalke-04 ita1-juventus eng1-leeds-united ita1-juventus'),
  p('Alphonso Davies', 'Canada', 'LB', 2000, 'usa1-vancouver-whitecaps ger1-bayern-munich', ['ucl'], { alt: ['Roadrunner'] }),
  p('Jonathan David', 'Canada', 'ST', 2000, 'bel1-gent fra1-lille ita1-juventus'),
  p('Hirving Lozano', 'Mexico', 'RW', 1995, 'mex1-pachuca ned1-psv ita1-napoli usa1-san-diego-fc', [], { alt: ['Chucky Lozano'] }),
  p('Guillermo Ochoa', 'Mexico', 'GK', 1985, 'mex1-club-america esp2-malaga bel1-standard-liege', [], { alt: ['Memo Ochoa'] }),
  p('Santiago Giménez', 'Mexico', 'ST', 2001, 'mex1-cruz-azul ned1-feyenoord ita1-ac-milan', [], { alt: ['Santiago Gimenez', 'Bebote'] }),
  p('Edson Álvarez', 'Mexico', 'CDM', 1997, 'mex1-club-america ned1-ajax eng1-west-ham-united tur1-fenerbahce', [], { alt: ['Edson Alvarez', 'Machin'] }),
  p('Raúl Jiménez', 'Mexico', 'ST', 1991, 'mex1-club-america esp1-atletico-madrid por1-benfica eng1-wolverhampton-wanderers eng1-fulham', [], { alt: ['Raul Jimenez'] }),
  p('Luis Suárez', 'Uruguay', 'ST', 1987, 'ned1-groningen ned1-ajax eng1-liverpool esp1-barcelona esp1-atletico-madrid bra1-gremio usa1-inter-miami', ['ucl', 'copa', 'goldenshoe'], { alt: ['Luis Suarez', 'El Pistolero'] }),
  p('Edinson Cavani', 'Uruguay', 'ST', 1987, 'ita2-palermo ita1-napoli fra1-paris-saint-germain eng1-manchester-united esp1-valencia arg1-boca-juniors', [], { alt: ['El Matador'] }),
  p('Federico Valverde', 'Uruguay', 'CM', 1998, 'esp1-real-madrid esp2-deportivo-la-coruna esp1-real-madrid', ['ucl'], { alt: ['El Pajarito'] }),
  p('Darwin Núñez', 'Uruguay', 'ST', 1999, 'esp2-almeria por1-benfica eng1-liverpool ksa1-al-hilal', [], { alt: ['Darwin Nunez'] }),
  p('Ronald Araújo', 'Uruguay', 'CB', 1999, 'esp1-barcelona', [], { alt: ['Ronald Araujo'] }),
  p('James Rodríguez', 'Colombia', 'CAM', 1991, 'arg1-banfield por1-fc-porto fra1-monaco esp1-real-madrid ger1-bayern-munich eng1-everton gre1-olympiacos', ['ucl'], { alt: ['James Rodriguez'] }),
  p('Luis Díaz', 'Colombia', 'LW', 1997, 'por1-fc-porto eng1-liverpool ger1-bayern-munich', [], { alt: ['Luis Diaz', 'Lucho'] }),
  p('Radamel Falcao', 'Colombia', 'ST', 1986, 'arg1-river-plate por1-fc-porto esp1-atletico-madrid fra1-monaco eng1-manchester-united eng1-chelsea tur1-galatasaray esp1-rayo-vallecano', ['europa'], { alt: ['El Tigre'] }),
  p('Alexis Sánchez', 'Chile', 'LW', 1988, 'ita1-udinese esp1-barcelona eng1-arsenal eng1-manchester-united ita1-inter-milan fra1-marseille ita1-udinese ita1-inter-milan', ['copa'], { alt: ['Alexis Sanchez', 'Nino Maravilla'] }),
  p('Arturo Vidal', 'Chile', 'CM', 1987, 'ger1-bayer-leverkusen ita1-juventus ger1-bayern-munich esp1-barcelona ita1-inter-milan bra1-flamengo', ['copa'], { alt: ['King Arturo'] }),

  // ----------------------------------------------------- the rest of Europe
  p('Granit Xhaka', 'Switzerland', 'CDM', 1992, 'sui1-basel ger1-borussia-monchengladbach eng1-arsenal ger1-bayer-leverkusen eng1-sunderland'),
  p('Yann Sommer', 'Switzerland', 'GK', 1988, 'sui1-basel ger1-borussia-monchengladbach ger1-bayern-munich ita1-inter-milan'),
  p('Manuel Akanji', 'Switzerland', 'CB', 1995, 'sui1-basel ger1-borussia-dortmund eng1-manchester-city ita1-inter-milan', ['ucl']),
  p('Xherdan Shaqiri', 'Switzerland', 'RW', 1991, 'sui1-basel ger1-bayern-munich ita1-inter-milan eng2-stoke-city eng1-liverpool usa1-chicago-fire sui1-basel', ['ucl'], { alt: ['Power Cube'] }),
  p('Gregor Kobel', 'Switzerland', 'GK', 1997, 'sui1-grasshopper ger1-hoffenheim ger1-vfb-stuttgart ger1-borussia-dortmund'),
  p('David Alaba', 'Austria', 'CB', 1992, 'ger1-bayern-munich esp1-real-madrid', ['ucl']),
  p('Marcel Sabitzer', 'Austria', 'CM', 1994, 'aut1-rapid-vienna ger1-rb-leipzig ger1-bayern-munich eng1-manchester-united ger1-borussia-dortmund'),
  p('Hakan Çalhanoğlu', 'Türkiye', 'CM', 1994, 'ger1-hamburg ger1-bayer-leverkusen ita1-ac-milan ita1-inter-milan', [], { alt: ['Hakan Calhanoglu'] }),
  p('Arda Güler', 'Türkiye', 'CAM', 2005, 'tur1-fenerbahce esp1-real-madrid', [], { alt: ['Arda Guler'] }),
  p('Kenan Yıldız', 'Türkiye', 'CAM', 2005, 'ita1-juventus', [], { alt: ['Kenan Yildiz'] }),
  p('Khvicha Kvaratskhelia', 'Georgia', 'LW', 2001, 'ita1-napoli fra1-paris-saint-germain', ['ucl'], { alt: ['Kvaradona', 'Kvara'] }),
  p('Jan Oblak', 'Slovenia', 'GK', 1993, 'por1-benfica esp1-atletico-madrid'),
  p('Scott McTominay', 'Scotland', 'CM', 1996, 'eng1-manchester-united ita1-napoli', ['europa'], { alt: ['McTominator'] }),
  p('Andy Robertson', 'Scotland', 'LB', 1994, 'sco1-celtic eng2-hull-city eng1-liverpool', ['ucl'], { alt: ['Andrew Robertson'] }),
  p('Gareth Bale', 'Wales', 'RW', 1989, 'eng2-southampton eng1-tottenham-hotspur esp1-real-madrid usa1-los-angeles-fc', ['ucl'], { retired: true, alt: ['El Gareth'] }),
  p('Caoimhín Kelleher', 'Republic of Ireland', 'GK', 1998, 'eng1-liverpool eng1-brentford', [], { alt: ['Caoimhin Kelleher'] }),
  p('Petr Čech', 'Czechia', 'GK', 1982, 'fra1-rennes eng1-chelsea eng1-arsenal', ['ucl', 'europa'], { retired: true, alt: ['Petr Cech'] }),
  p('Andriy Shevchenko', 'Ukraine', 'ST', 1976, 'ita1-ac-milan eng1-chelsea ita1-ac-milan', ['ucl', 'ballondor'], { retired: true, alt: ['Sheva'] }),
  p('Rivaldo', 'Brazil', 'CAM', 1972, 'esp2-deportivo-la-coruna esp1-barcelona ita1-ac-milan gre1-olympiacos', ['ucl', 'worldcup', 'ballondor'], { retired: true }),
]

/**
 * One book. Honours that arrived after a man was first written down are patched
 * on here rather than by editing three hundred lines: a Club World Cup or an
 * Olympic gold is a fact about a career, not a new career.
 */
export const LEGENDS: Legend[] = [...CORE, ...MORE_LEGENDS].map((l) => {
  const extra = HONOUR_PATCH[l.id]
  return extra ? { ...l, honours: [...new Set([...l.honours, ...extra])] } : l
})

export const LEGEND_BY_ID: Record<string, Legend> = Object.fromEntries(
  LEGENDS.map((l) => [l.id, l]),
)

/**
 * Countries the quiz needs that nobody in the career game plays for.
 *
 * The career simulator only ever needed the sixty odd nations it can hand you
 * at birth. The book of real footballers reaches a good deal further than that,
 * so everybody else lives here, with the flag to draw and the confederation a
 * warm answer in the guessing game is measured against.
 */
const EXTRA_NATIONS: Record<string, { flag: string; conf: Confederation }> = {
  Angola: { flag: 'ao', conf: 'CAF' },
  Armenia: { flag: 'am', conf: 'UEFA' },
  Azerbaijan: { flag: 'az', conf: 'UEFA' },
  Belarus: { flag: 'by', conf: 'UEFA' },
  'Bosnia and Herzegovina': { flag: 'ba', conf: 'UEFA' },
  Bulgaria: { flag: 'bg', conf: 'UEFA' },
  'Burkina Faso': { flag: 'bf', conf: 'CAF' },
  Burundi: { flag: 'bi', conf: 'CAF' },
  'Cape Verde': { flag: 'cv', conf: 'CAF' },
  Comoros: { flag: 'km', conf: 'CAF' },
  Congo: { flag: 'cg', conf: 'CAF' },
  Curaçao: { flag: 'cw', conf: 'CONCACAF' },
  Cyprus: { flag: 'cy', conf: 'UEFA' },
  'DR Congo': { flag: 'cd', conf: 'CAF' },
  'Equatorial Guinea': { flag: 'gq', conf: 'CAF' },
  Estonia: { flag: 'ee', conf: 'UEFA' },
  Gabon: { flag: 'ga', conf: 'CAF' },
  Gambia: { flag: 'gm', conf: 'CAF' },
  Georgia: { flag: 'ge', conf: 'UEFA' },
  Guinea: { flag: 'gn', conf: 'CAF' },
  'Guinea-Bissau': { flag: 'gw', conf: 'CAF' },
  Haiti: { flag: 'ht', conf: 'CONCACAF' },
  Honduras: { flag: 'hn', conf: 'CONCACAF' },
  'Hong Kong': { flag: 'hk', conf: 'AFC' },
  Hungary: { flag: 'hu', conf: 'UEFA' },
  Indonesia: { flag: 'id', conf: 'AFC' },
  Iraq: { flag: 'iq', conf: 'AFC' },
  Israel: { flag: 'il', conf: 'UEFA' },
  Jordan: { flag: 'jo', conf: 'AFC' },
  Kazakhstan: { flag: 'kz', conf: 'UEFA' },
  Kenya: { flag: 'ke', conf: 'CAF' },
  Kosovo: { flag: 'xk', conf: 'UEFA' },
  Kuwait: { flag: 'kw', conf: 'AFC' },
  Latvia: { flag: 'lv', conf: 'UEFA' },
  Liberia: { flag: 'lr', conf: 'CAF' },
  Libya: { flag: 'ly', conf: 'CAF' },
  Lithuania: { flag: 'lt', conf: 'UEFA' },
  Luxembourg: { flag: 'lu', conf: 'UEFA' },
  Malaysia: { flag: 'my', conf: 'AFC' },
  Mali: { flag: 'ml', conf: 'CAF' },
  Mauritania: { flag: 'mr', conf: 'CAF' },
  Montenegro: { flag: 'me', conf: 'UEFA' },
  Mozambique: { flag: 'mz', conf: 'CAF' },
  Namibia: { flag: 'na', conf: 'CAF' },
  'New Zealand': { flag: 'nz', conf: 'OFC' },
  'North Macedonia': { flag: 'mk', conf: 'UEFA' },
  'Northern Ireland': { flag: 'gb-nir', conf: 'UEFA' },
  Oman: { flag: 'om', conf: 'AFC' },
  Palestine: { flag: 'ps', conf: 'AFC' },
  Philippines: { flag: 'ph', conf: 'AFC' },
  Russia: { flag: 'ru', conf: 'UEFA' },
  Rwanda: { flag: 'rw', conf: 'CAF' },
  'Sierra Leone': { flag: 'sl', conf: 'CAF' },
  Suriname: { flag: 'sr', conf: 'CONCACAF' },
  Syria: { flag: 'sy', conf: 'AFC' },
  Tanzania: { flag: 'tz', conf: 'CAF' },
  Thailand: { flag: 'th', conf: 'AFC' },
  Togo: { flag: 'tg', conf: 'CAF' },
  'Trinidad and Tobago': { flag: 'tt', conf: 'CONCACAF' },
  Uganda: { flag: 'ug', conf: 'CAF' },
  'United Arab Emirates': { flag: 'ae', conf: 'AFC' },
  Uzbekistan: { flag: 'uz', conf: 'AFC' },
  Vietnam: { flag: 'vn', conf: 'AFC' },
  Zambia: { flag: 'zm', conf: 'CAF' },
  Zimbabwe: { flag: 'zw', conf: 'CAF' },
}

export function flagOf(nation: string): string {
  return NATION_BY_NAME[nation]?.flag ?? EXTRA_NATIONS[nation]?.flag ?? 'un'
}

export function confOf(nation: string): Confederation | null {
  return NATION_BY_NAME[nation]?.conf ?? EXTRA_NATIONS[nation]?.conf ?? null
}

export function clubName(id: string): string {
  return CLUB_BY_ID[id]?.name ?? id
}

/** Nations that appear on at least `min` players, sorted by how many. */
export function nationsWithCount(min = 1): { nation: string; count: number }[] {
  const tally = new Map<string, number>()
  for (const l of LEGENDS) tally.set(l.nation, (tally.get(l.nation) ?? 0) + 1)
  return [...tally]
    .filter(([, n]) => n >= min)
    .map(([nation, count]) => ({ nation, count }))
    .sort((a, b) => b.count - a.count)
}

/** Clubs that appear on at least `min` players, sorted by how many. */
export function clubsWithCount(min = 1): { clubId: string; count: number }[] {
  const tally = new Map<string, number>()
  for (const l of LEGENDS) for (const c of l.careerClubs) tally.set(c, (tally.get(c) ?? 0) + 1)
  return [...tally]
    .filter(([, n]) => n >= min)
    .map(([clubId, count]) => ({ clubId, count }))
    .sort((a, b) => b.count - a.count)
}

// ------------------------------------------------------------------- search

/**
 * Typing a name has to forgive everything a keyboard makes hard: accents,
 * hyphens, apostrophes, and the fact that half of Brazil goes by one word.
 * A match on the start of any word beats a match in the middle of one, so
 * "mar" offers Marquinhos before it offers Lautaro Martínez.
 */
export function searchLegends(query: string, limit = 8, exclude: string[] = []): Legend[] {
  const q = fold(query)
  if (!q) return []
  const skip = new Set(exclude)
  const hits: { legend: Legend; score: number }[] = []

  for (const legend of LEGENDS) {
    if (skip.has(legend.id)) continue
    let best = 0
    legend.keys.forEach((key, i) => {
      if (!key.includes(q)) return
      const at = key.indexOf(q)
      // the name he is listed under outranks a nickname, so "messi" is Messi
      // and not the boy they call Messinho
      const score = (at === 0 ? 3 : key[at - 1] === ' ' ? 2 : 1) + (i === 0 ? 3 : 0)
      if (score > best) best = score
    })
    if (best) hits.push({ legend, score: best })
  }

  return hits
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.legend.name.length - b.legend.name.length ||
        a.legend.name.localeCompare(b.legend.name),
    )
    .slice(0, limit)
    .map((h) => h.legend)
}

/** The one player a typed name means, if it means exactly one. */
export function exactLegend(query: string): Legend | null {
  const q = fold(query)
  if (!q) return null
  return LEGENDS.find((l) => l.keys.includes(q)) ?? null
}
