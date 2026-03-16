// ============================
// Shepherd's Arsenal Hub - Live Data
// Uses football-data.org free API
// ============================

// API configuration
var API_BASE = 'https://api.football-data.org/v4';
var API_KEY  = '5eb54d3597134ddf88581ef5f582dc5d'; // Free key from football-data.org
var ARSENAL_ID = 57;
var PL_CODE = 'PL';

// ── FETCH WRAPPER ──
// Adds the API key header to every request
function fetchAPI(endpoint) {
  return fetch(API_BASE + endpoint, {
    headers: { 'X-Auth-Token': API_KEY }
  }).then(function(response) {
    if (!response.ok) {
      throw new Error('API request failed: ' + response.status);
    }
    return response.json();
  });
}

// ── DATE FORMATTING ──
// Converts "2026-03-14T15:00:00Z" into "Sat, 14 Mar 2026"
function formatMatchDate(utcDateString) {
  var date = new Date(utcDateString);
  var days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var months = ['Jan','Feb','Mar','Apr','May','Jun',
                'Jul','Aug','Sep','Oct','Nov','Dec'];
  return days[date.getDay()] + ', ' +
         date.getDate() + ' ' +
         months[date.getMonth()] + ' ' +
         date.getFullYear();
}

// ── FALLBACK FIXTURE DATA ──
// Shown if the API is down or the key hasn't been set yet
var FALLBACK_FIXTURES = [
  { date: 'Sat, 14 Mar 2026', opponent: 'Everton',          venue: 'HOME' },
  { date: 'Sat, 21 Mar 2026', opponent: 'Wolverhampton',    venue: 'AWAY' },
  { date: 'Sat, 11 Apr 2026', opponent: 'Bournemouth',      venue: 'HOME' },
  { date: 'Sat, 18 Apr 2026', opponent: 'Manchester City',  venue: 'AWAY' },
  { date: 'Sat, 25 Apr 2026', opponent: 'Newcastle United', venue: 'HOME' }
];

// ── RENDER FIXTURE ROWS ──
// Takes an array of { date, opponent, venue } and puts them in the table
function renderFixtureRows(container, fixtures) {
  container.innerHTML = '';
  fixtures.forEach(function(match) {
    var venueClass = match.venue === 'HOME' ? 'home-tag' : 'away-tag';
    var row = document.createElement('tr');
    row.innerHTML =
      '<td>' + match.date + '</td>' +
      '<td>' + match.opponent + '</td>' +
      '<td class="' + venueClass + '">' + match.venue + '</td>';
    container.appendChild(row);
  });
}

// ── LOAD FIXTURES (index.html) ──
function loadFixtures() {
  var container = document.getElementById('fixtures-body');
  if (!container) return; // Not on the fixtures page

  // Show loading state
  container.innerHTML =
    '<tr><td colspan="3" style="text-align:center;padding:24px;color:#9C824A;">' +
    'Loading fixtures...</td></tr>';

  fetchAPI('/teams/' + ARSENAL_ID + '/matches?status=SCHEDULED&limit=5')
    .then(function(data) {
      var matches = data.matches;
      if (!matches || matches.length === 0) {
        throw new Error('No upcoming matches found');
      }

      // Convert API data into our simple format
      var fixtures = matches.map(function(match) {
        var isHome   = match.homeTeam.id === ARSENAL_ID;
        var opponent = isHome
          ? (match.awayTeam.shortName || match.awayTeam.name)
          : (match.homeTeam.shortName || match.homeTeam.name);
        return {
          date:     formatMatchDate(match.utcDate),
          opponent: opponent,
          venue:    isHome ? 'HOME' : 'AWAY'
        };
      });

      renderFixtureRows(container, fixtures);
    })
    .catch(function(error) {
      console.warn('Fixtures API failed, using fallback data:', error);
      renderFixtureRows(container, FALLBACK_FIXTURES);

      // Show a subtle notice that we're using cached data
      var notice = document.getElementById('fixtures-notice');
      if (notice) {
        notice.textContent = '(Showing cached fixtures \u2014 live data unavailable)';
        notice.style.display = 'block';
      }
    });
}

// ── LOAD STANDINGS (standings.html) ──
function loadStandings() {
  var container = document.getElementById('standings-body');
  if (!container) return; // Not on the standings page

  // Show loading state
  container.innerHTML =
    '<tr><td colspan="8" style="text-align:center;padding:24px;color:#9C824A;">' +
    'Loading standings...</td></tr>';

  fetchAPI('/competitions/' + PL_CODE + '/standings')
    .then(function(data) {
      // Find the TOTAL standings (not HOME or AWAY splits)
      var totalStandings = data.standings.find(function(s) {
        return s.type === 'TOTAL';
      });

      if (!totalStandings || !totalStandings.table) {
        throw new Error('No standings data found');
      }

      container.innerHTML = '';

      totalStandings.table.forEach(function(entry) {
        var row = document.createElement('tr');
        var isArsenal = entry.team.id === ARSENAL_ID;

        // Highlight Arsenal's row
        if (isArsenal) {
          row.style.background = 'rgba(239,1,7,0.12)';
          row.style.fontWeight = '700';
        }

        var posStyle = 'text-align:center;' + (isArsenal ? 'color:#EF0107;font-weight:800;' : '');
        var ptsStyle = 'text-align:center;font-weight:700;' + (isArsenal ? 'color:#EF0107;' : 'color:#e8e8e8;');
        var teamName = isArsenal
          ? '<strong style="color:#EF0107;">' + entry.team.shortName + '</strong>'
          : entry.team.shortName;

        row.innerHTML =
          '<td style="' + posStyle + '">' + entry.position + '</td>' +
          '<td>' +
            '<img src="' + entry.team.crest + '" alt="" style="width:20px;height:20px;vertical-align:middle;margin-right:8px;">' +
            teamName +
          '</td>' +
          '<td style="text-align:center;">' + entry.playedGames + '</td>' +
          '<td style="text-align:center;">' + entry.won + '</td>' +
          '<td style="text-align:center;">' + entry.draw + '</td>' +
          '<td style="text-align:center;">' + entry.lost + '</td>' +
          '<td style="text-align:center;">' + entry.goalDifference + '</td>' +
          '<td style="' + ptsStyle + '">' + entry.points + '</td>';

        container.appendChild(row);
      });
    })
    .catch(function(error) {
      console.warn('Standings API failed:', error);
      container.innerHTML =
        '<tr><td colspan="8" style="text-align:center;padding:24px;color:#EF0107;">' +
        'Could not load standings. Please try again later.' +
        '</td></tr>';
    });
}

// ── INIT ──
// Run the right loader when the page finishes loading
document.addEventListener('DOMContentLoaded', function() {
  loadFixtures();
  loadStandings();
});
