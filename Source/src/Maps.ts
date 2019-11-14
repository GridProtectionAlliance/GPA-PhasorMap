
export default {
	'CartoDB Positron': {
		url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
		attribution:
			'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
			'&copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
		subdomains: 'abcd',
	},
	'CartoDB Dark': {
		url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
		attribution:
			'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
			'&copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
		subdomains: 'abcd',
	},
	'OpenStreetMap Mapnik': {
		url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		subdomains: 'abcd',
	},
	'Open Topo Map': {
		url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
			'&copy; <a href="http://viewfinderpanoramas.org"> SRTM < /a>' +
			'&copy; < a href="https://opentopomap.org"> OpenTopoMap < /a>' +
			'&copy; (<a href="https://creativecommons.org/licenses/by-sa/3.0/"> CC - BY - SA < /a>)',
		subdomains: 'abc',
	},
	'Esri WorldPhysical': {
		url: 'https://se{s}ver.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
		attribution: 'Tiles &copy Esri — Source: US National Park Service',
		subdomains: 'r'
	},
	'Esri NatGeo': {
		url: 'https://se{s}ver.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
		attribution: 'Tiles &copy Esri —  National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
		subdomains: 'r'
	},
	'Esri WorldShaded': {
		url: 'https://se{s}ver.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
		attribution: 'Tiles &copy; Esri &mdash; Source: Esri',
		maxZoom: 13,
		subdomains: 'r'
	}

}

