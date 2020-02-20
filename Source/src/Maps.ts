//import * as L from './libs/leaflet';
import PhasorMapCtrl from './worldmap_ctrl';
export { mapOptions }

export default class Map {
	ctrl: PhasorMapCtrl;
	user: boolean;
	isactive: boolean;
	name: string;
	maps: any[];
	transitions: number[];
	maxZoom: number;
	activeMap: number;

	constructor(ctrl: PhasorMapCtrl, name: string, param: any, isUser?: boolean) {
		this.ctrl = ctrl;
		this.user = (isUser == undefined) ? false : isUser;
		this.isactive = (this.user) ? false : true;
		this.name = name;
		this.activeMap = 0;

		this.maps = [];
		this.transitions = [];
		this.maxZoom = 1.0;

	}

	addMap(map: string, zoom: number) {
		this.maps.push(map);
		this.transitions.push(zoom);

		this.updateMap();
	}

	deleteMap(index: number) {

		if (index < 1)
			return

		this.maps.splice(index, 1)
		
		this.transitions[index - 1] = this.transitions[index]
		this.transitions.splice(index, 1) 

		this.updateMap();
	}

	updateMap() {
		//sort properly
		let temp: any[] = [];
		this.maps.forEach((item, index) => {
			console.log(item)
			temp.push({ map: item, transition: Math.min(this.transitions[index], mapOptions[item].maxZoom) })
		});

		temp.sort((a, b) => (a.transition > b.transition) ? 1 : ((b.transition > a.transition) ? -1 : 0));

		this.maps = temp.map(item => item.map);
		this.transitions = temp.map(item => item.transition);

		console.log(this.maps)
		// set absolute maximum zoom => last map
		this.maxZoom = mapOptions[this.maps[this.maps.length - 1]].maxZoom;
	}

	getLayer(zoom: number) {

		this.activeMap = this.getMap(zoom)
		let map = this.maps[this.activeMap];

		return  (<any>window).L.tileLayer(mapOptions[map].url, {
			maxZoom: this.maxZoom,
			subdomains: mapOptions[map].subdomains,
			reuseTiles: true,
			detectRetina: true,
			attribution: mapOptions[map].attribution,
		})

	}

	//update Map
	getMap(zoom: number) {

		
		// Figure out which Map should be shown according to the zoom level....
		if (this.transitions.length == 1)
			return 0;

		let i = 0;
		for (i = 0; i < this.transitions.length; i++) {
			if (zoom < this.transitions[i]) {
				return (i );
			}
		}

		return (this.maps.length - 1)
	}

	// Serialize Maps for Json Storage
	// This is neccesarry because Grafana is stupid and can't handle objects in the settings.
	Serialize() {
		let result = {
			user: this.user,
			name: this.name,
			maps: this.maps,
			transitions: this.transitions,
			maxZoom: this.maxZoom
		};

		return result;
	}

	static Deserialize(ctrl, jsonobject) {
		let result = new Map(ctrl, "", {}, false)

		if (jsonobject.user) {
			result.user = jsonobject.user
		}
		if (jsonobject.transitions) {
			result.transitions = jsonobject.transitions
		}
		if (jsonobject.name) {
			result.name = jsonobject.name
		}
		if (jsonobject.maps) {
			result.maps = jsonobject.maps
		}
		if (jsonobject.maxZoom) {
			result.maxZoom = jsonobject.maxZoom
		}

		return result;
	}

}


var mapOptions = {
	'CartoDB Positron': {
		url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
		attribution:
			'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <br>' +
			'&copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
		subdomains: 'abcd',
		maxZoom: 19,
	},
	'CartoDB Dark': {
		url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
		attribution:
			'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <br> ' +
			'&copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
		subdomains: 'abcd',
		maxZoom: 19.
	},
	'OpenStreetMap Mapnik': {
		url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		subdomains: 'abcd',
		maxZoom: 19,
	},
	'Open Topo Map': {
		url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> <br>' +
			'&copy; <a href="http://viewfinderpanoramas.org"> SRTM </a> <br>' +
			'&copy; <a href="https://opentopomap.org"> OpenTopoMap </a> <br>' +
			'&copy; (<a href="https://creativecommons.org/licenses/by-sa/3.0/"> CC-BY-SA </a>)',
		subdomains: 'abc',
		maxZoom: 17,
	},
	'Esri WorldPhysical': {
		url: 'https://se{s}ver.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
		attribution: 'Tiles &copy Esri — Source: US National Park Service',
		subdomains: 'r',
		maxZoom: 8,
	},
	'Esri NatGeo': {
		url: 'https://se{s}ver.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
		attribution: 'Tiles &copy Esri —  National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
		subdomains: 'r',
		maxZoom: 16,
	},
	'Esri WorldShaded': {
		url: 'https://se{s}ver.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
		attribution: 'Tiles &copy; Esri &mdash; Source: Esri',
		maxZoom: 13,
		subdomains: 'r',
	},

	'Stamen Toner': {
		url: 'http://til{s}.stamen.com/toner/{z}/{x}/{y}.png',
		attribution: 'tiles by Stamen Design, under CC BY 3.0. <br> Data by OpenStreetMap, under ODbL.',
		maxZoom: 13,
		subdomains: 'e',
	},

	'Stamen Terrain': {
		url: 'http://til{s}.stamen.com/terrain/{z}/{x}/{y}.jpg',
		attribution: 'Tiles by Stamen Design, under CC BY 3.0. <br> Data by OpenStreetMap, under ODbL.',
		maxZoom: 13,
		subdomains: 'e',
	},

	'Stamen Watercolor': {
		url: 'http://til{s}.stamen.com/watercolor/{z}/{x}/{y}.jpg',
		attribution: 'Map tiles by Stamen Design, under CC BY 3.0.<br> Data by OpenStreetMap, under CC BY SA',
		maxZoom: 13,
		subdomains: 'e',
	},

	
}