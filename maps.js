// Initialize the map
const map = L.map('map').setView([45.4237, -75.6987], 15);


// Add the base tile layer (Stamen Terrain)
//const baseLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
//    attribution: 'Map tiles by Openstreetmap, CC BY 3.0'
//}).addTo(map);

const layer66211 = L.tileLayer('https://www.mapwarper.net/maps/tile/36911/{z}/{x}/{y}.png',{
    attribution: 'LAC'
});

const layer61034 = L.tileLayer('https://www.mapwarper.net/maps/tile/61034/{z}/{x}/{y}.png',{
    attribution: 'LAC'
});

const layer65528 = L.tileLayer('https://www.mapwarper.net/maps/tile/65528/{z}/{x}/{y}.png',{
    attribution: 'LAC'
});

// Create a layer control
const layerControl = L.control.layers({}, {
    'LAC 36911': layer36911,
    'LAC 61034': layer61034,
    'LAC 65528': layer65528
}, { hideSingleBase: true }).addTo(map);

// Initialize the marker cluster group
const markers = L.markerClusterGroup();

// Create custom icons for different settlement types
const icons = {
    colony: L.divIcon({
        className: 'custom-icon colony',
        html: '<span style="background-color: #e74c3c; width: 12px; height: 12px; border-radius: 50%; display: block;"></span>',
        iconSize: [12, 12]
    }),
    settlement: L.divIcon({
        className: 'custom-icon settlement',
        html: '<span style="background-color: #2ecc71; width: 10px; height: 10px; border-radius: 50%; display: block;"></span>',
        iconSize: [10, 10]
    }),
    trading_post: L.divIcon({
        className: 'custom-icon trading_post',
        html: '<span style="background-color: #f1c40f; width: 8px; height: 8px; border-radius: 50%; display: block;"></span>',
        iconSize: [8, 8]
    })
};

// Add legend
const legend = L.control({position: 'bottomright'});
legend.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'info legend');
    div.innerHTML = `
        <h4>Settlement Types</h4>
        <div><i style="background: #e74c3c"></i> Colony</div>
        <div><i style="background: #2ecc71"></i> Settlement</div>
        <div><i style="background: #f1c40f"></i> Trading Post</div>
        <h4>Historic Journeys</h4>
        ${journeyData.map(journey => `
            <div>
                <i style="background: ${journey.color}"></i> 
                ${journey.label} (${journey.startYear}-${journey.endYear})
            </div>
        `).join('')}
    `;
    return div;
};

// Load and process the historical data
let historicalSites = [];
fetch('data/historical-sites.csv')
  .then(response => response.text())
  .then(csvText => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    console.log('Headers:', headers);
        
        historicalSites = lines.slice(1).map(line => {
            const values = line.split(',');
            console.log('Values:', values);
            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [
                        parseFloat(values[headers.indexOf('longitude')]),
                        parseFloat(values[headers.indexOf('latitude')])
                    ]
                },
                properties: {
                    name: values[headers.indexOf('name')],
                    year: parseInt(values[headers.indexOf('year')]),
                    type: values[headers.indexOf('type')],
                    description: values[headers.indexOf('description')],
                    extra: values[headers.indexOf('extra')]
                }
            };
        }).filter(site => !isNaN(site.geometry.coordinates[0]) && !isNaN(site.geometry.coordinates[1]));
        console.log('Sites:', historicalSites);
        // Initial map update
        updateMapForYear(1601);
    })
    .catch(error => {
        console.error('Error loading CSV:', error);
    });

// Define the journey data - add more points as needed
const journeyData = [
    {
        points: [
            [43.1595, -79.2473],  // Starting point
            [41.4993, -81.6944],  // Cleveland
            [40.7128, -74.0060], //another point
            [39.7377, -75.5472]   // Final destination
        ],
        startYear: 1750,
        endYear: 1760,
        color: '#FF4444',
        weight: 3,
        label: 'Historic Journey 2'
    },
    {
        points: [
            [40.7128, -74.0060],  // Starting point
            [41.8240, -71.4128],  // Providence
            [47.518890, -52.805832], //another point
            [42.3601, -71.0589]   // Final destination
        ],
        startYear: 1601,
        endYear: 1770, // you'd make separate arrays for all the points covered in a year maybe. You'd want to think hard about this.
        color: '#4444FF',
        weight: 3,
        label: 'Historic Journey 1'
    }
    // Add more journeys as needed
];

// Create a map to store our journey polylines
const journeyLines = new Map();

// Initialize journey lines
journeyData.forEach((journey, index) => {
    const line = L.polyline([], {
        color: journey.color,
        weight: journey.weight,
        opacity: 0.8
    }).addTo(map);
    
    journeyLines.set(index, {
        line: line,
        currentPoints: []
    });
});

// Timeline functionality
const yearSlider = document.getElementById('yearSlider');
const yearDisplay = document.getElementById('yearDisplay');
const playButton = document.getElementById('playButton');

let isPlaying = false;
let animationInterval;

yearSlider.addEventListener('input', function(e) {
    const year = parseInt(e.target.value);
    yearDisplay.textContent = year;
    updateMapForYear(year);
});

playButton.addEventListener('click', function() {
    if (isPlaying) {
        stopAnimation();
    } else {
        startAnimation();
    }
});

function startAnimation() {
    isPlaying = true;
    playButton.textContent = '⏸ Pause';
    
    animationInterval = setInterval(() => {
        const currentYear = parseInt(yearSlider.value);
        if (currentYear >= 1800) {
            stopAnimation();
            return;
        }
        
        yearSlider.value = currentYear + 1;
        yearDisplay.textContent = currentYear + 1;
        updateMapForYear(currentYear + 1);
    }, 100);
}

function stopAnimation() {
    isPlaying = false;
    playButton.textContent = '▶ Play';
    clearInterval(animationInterval);
}

function updateMapForYear(year) {
    // Existing marker code
    markers.clearLayers();
    
    const visibleSites = historicalSites.filter(site => 
        site.properties.year <= year
    );
    
    visibleSites.forEach(site => {
        const marker = L.marker([
            site.geometry.coordinates[1],
            site.geometry.coordinates[0]
        ], {
            icon: icons[site.properties.type]
        });
        
        marker.bindPopup(`
            <div class="popup-content">
                <h3>${site.properties.name}</h3>
                <p>Established: ${site.properties.year}</p>
                <p>${site.properties.description}</p>
                <p>${site.properties.extra}</p>
            </div>
        `);
        
        markers.addLayer(marker);
    });
    
    map.addLayer(markers);

    // Update muppet lines
    journeyData.forEach((journey, index) => {
        const journeyLine = journeyLines.get(index);
        
        // If we're before the journey starts, clear the line
        if (year < journey.startYear) {
            journeyLine.line.setLatLngs([]);
            return;
        }
        
        // If we're after the journey ends, show the complete line
        if (year >= journey.endYear) {
            journeyLine.line.setLatLngs(journey.points);
            return;
        }
        
        // Calculate progress through the entire journey
        const journeyProgress = (year - journey.startYear) / 
                              (journey.endYear - journey.startYear);
        
        // Calculate which segment we're on and the progress within that segment
        const totalSegments = journey.points.length - 1;
        const segmentIndex = Math.floor(journeyProgress * totalSegments);
        const segmentProgress = (journeyProgress * totalSegments) % 1;
        
        // Get current segment's start and end points
        const segmentStart = journey.points[segmentIndex];
        const segmentEnd = journey.points[Math.min(segmentIndex + 1, journey.points.length - 1)];
        
        // Interpolate current position
        const currentLat = segmentStart[0] + 
            (segmentEnd[0] - segmentStart[0]) * segmentProgress;
        const currentLng = segmentStart[1] + 
            (segmentEnd[1] - segmentStart[1]) * segmentProgress;
        
        // Create array of points up to current position
        const currentPoints = [
            ...journey.points.slice(0, segmentIndex + 1),
            [currentLat, currentLng]
        ];
        
        journeyLine.line.setLatLngs(currentPoints);
    });
}

legend.addTo(map);
