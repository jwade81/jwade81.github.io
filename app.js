// ============================
// Shepherd's Arsenal Hub - Live Data
// Uses ESPN's free public API (no API key needed!)
// ============================

// ESPN API endpoints
var FIXTURES_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams/359/schedule?fixture=true';
var STANDINGS_URL = 'https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings';
var ARSENAL_ESPN_ID = '359';

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
// Shown if the API is down
var FALLBACK_FIXTURES = [
  { date: 'Sat, 11 Apr 2026', opponent: 'AFC Bournemouth',  venue: 'HOME' },
  { date: 'Sat, 19 Apr 2026', opponent: 'Manchester City',  venue: 'AWAY' },
  { date: 'Sat, 25 Apr 2026', opponent: 'Newcastle United', venue: 'HOME' },
  { date: 'Sat, 2 May 2026',  opponent: 'Fulham',           venue: 'HOME' },
  { date: 'Sat, 9 May 2026',  opponent: 'West Ham United',  venue: 'AWAY' }
];

// ── RENDER FIXTURE ROWS ──
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

// ── HELPER: get a stat value from ESPN stats array ──
function getStat(stats, statName) {
  for (var i = 0; i < stats.length; i++) {
    if (stats[i].name === statName) {
      return stats[i].displayValue;
    }
  }
  return '0';
}

// ── LOAD FIXTURES (index.html) ──
function loadFixtures() {
  var container = document.getElementById('fixtures-body');
  if (!container) return;

  // Show loading state
  container.innerHTML =
    '<tr><td colspan="3" style="text-align:center;padding:24px;color:#9C824A;">' +
    'Loading fixtures...</td></tr>';

  fetch(FIXTURES_URL)
    .then(function(response) {
      if (!response.ok) throw new Error('API request failed: ' + response.status);
      return response.json();
    })
    .then(function(data) {
      var events = data.events;
      if (!events || events.length === 0) {
        throw new Error('No upcoming matches found');
      }

      // Only show first 5 upcoming matches
      var fixtures = events.slice(0, 5).map(function(event) {
        var comp = event.competitions[0];
        var competitors = comp.competitors;

        // Find home and away teams
        var homeTeam = null;
        var awayTeam = null;
        for (var i = 0; i < competitors.length; i++) {
          if (competitors[i].homeAway === 'home') homeTeam = competitors[i];
          if (competitors[i].homeAway === 'away') awayTeam = competitors[i];
        }

        var isHome = homeTeam && homeTeam.team.id === ARSENAL_ESPN_ID;
        var opponent = isHome
          ? (awayTeam.team.shortDisplayName || awayTeam.team.displayName)
          : (homeTeam.team.shortDisplayName || homeTeam.team.displayName);

        return {
          date:     formatMatchDate(event.date),
          opponent: opponent,
          venue:    isHome ? 'HOME' : 'AWAY'
        };
      });

      renderFixtureRows(container, fixtures);
    })
    .catch(function(error) {
      console.warn('Fixtures API failed, using fallback data:', error);
      renderFixtureRows(container, FALLBACK_FIXTURES);

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
  if (!container) return;

  // Show loading state
  container.innerHTML =
    '<tr><td colspan="8" style="text-align:center;padding:24px;color:#9C824A;">' +
    'Loading standings...</td></tr>';

  fetch(STANDINGS_URL)
    .then(function(response) {
      if (!response.ok) throw new Error('API request failed: ' + response.status);
      return response.json();
    })
    .then(function(data) {
      var entries = data.children[0].standings.entries;
      if (!entries || entries.length === 0) {
        throw new Error('No standings data found');
      }

      // Sort by rank
      entries.sort(function(a, b) {
        return parseInt(getStat(a.stats, 'rank')) - parseInt(getStat(b.stats, 'rank'));
      });

      container.innerHTML = '';

      entries.forEach(function(entry) {
        var row = document.createElement('tr');
        var isArsenal = entry.team.id === ARSENAL_ESPN_ID;
        var rank = getStat(entry.stats, 'rank');
        var played = getStat(entry.stats, 'gamesPlayed');
        var wins = getStat(entry.stats, 'wins');
        var draws = getStat(entry.stats, 'ties');
        var losses = getStat(entry.stats, 'losses');
        var gd = getStat(entry.stats, 'pointDifferential');
        var points = getStat(entry.stats, 'points');
        var logo = entry.team.logos[0].href;
        var teamName = entry.team.displayName;

        // Highlight Arsenal's row
        if (isArsenal) {
          row.style.background = 'rgba(239,1,7,0.12)';
          row.style.fontWeight = '700';
        }

        var posStyle = 'text-align:center;' + (isArsenal ? 'color:#EF0107;font-weight:800;' : '');
        var ptsStyle = 'text-align:center;font-weight:700;' + (isArsenal ? 'color:#EF0107;' : 'color:#e8e8e8;');
        var nameHtml = isArsenal
          ? '<strong style="color:#EF0107;">' + teamName + '</strong>'
          : teamName;

        row.innerHTML =
          '<td style="' + posStyle + '">' + rank + '</td>' +
          '<td>' +
            '<img src="' + logo + '" alt="" style="width:20px;height:20px;vertical-align:middle;margin-right:8px;">' +
            nameHtml +
          '</td>' +
          '<td style="text-align:center;">' + played + '</td>' +
          '<td style="text-align:center;">' + wins + '</td>' +
          '<td style="text-align:center;">' + draws + '</td>' +
          '<td style="text-align:center;">' + losses + '</td>' +
          '<td style="text-align:center;">' + gd + '</td>' +
          '<td style="' + ptsStyle + '">' + points + '</td>';

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
document.addEventListener('DOMContentLoaded', function() {
  loadFixtures();
  loadStandings();
});
