import * as _ from 'lodash';
import * as L from './libs/leaflet';
import PhasorMapCtrl from './worldmap_ctrl';

export const tileServers = {
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
	'Stamen TerrainBackground': {
		url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain-background/{z}/{x}/{y}{r}.png',
		attribution: '&copy; <a href="http://stamen.com">Stamen Design</a> ' +
			'&copy; <a href="http://creativecommons.org/licenses/by/3.0"> CC BY 3.0 < /a> ' + 
			'& copy; < a href="https:/ / www.openstreetmap.org / copyright" > OpenStreetMap < /a>',
		subdomains: 'abc'
	}
}


export default class PhasorMap {
	ctrl: PhasorMapCtrl;
    mapContainer: any;
    circles: any[];
    arrows: any[];
    map: any;
    legend: any;
    featuresLayer: any;
    Controlledlayer: any;
    switchableLayer: any;
	staticSeperateLayer: any[];
	backgroundlayer: any;

    constructor(ctrl, mapContainer) {
        this.ctrl = ctrl;
        this.mapContainer = mapContainer;
        this.circles = [];
        this.arrows = [];
		this.switchableLayer = {};
		this.staticSeperateLayer = [];
    }

    createMap() {
        const mapCenter = (<any>window).L.latLng(
            parseFloat(this.ctrl.panel.mapCenterLatitude),
            parseFloat(this.ctrl.panel.mapCenterLongitude)
        );
        this.map = L.map(this.mapContainer, {
            worldCopyJump: true,
            preferCanvas: true,
            center: mapCenter,
            zoom: parseFloat(this.ctrl.panel.initialZoom) || 1,
        });

        this.setMouseWheelZoom();

		const selectedTileServer = tileServers[this.ctrl.tileServer];
		this.backgroundlayer = (<any>window).L.tileLayer(selectedTileServer.url, {
            maxZoom: 18,
            subdomains: selectedTileServer.subdomains,
            reuseTiles: true,
            detectRetina: true,
            attribution: selectedTileServer.attribution,
        }).addTo(this.map);

        this.Controlledlayer = L.control.layers(null).addTo(this.map);
        this.map.on("zoomend", () => {
            this.drawFeatures();
        });
    }

    updateStaticLayer() {
        this.clearStaticLayer();
        this.updateControlledLayer();

		this.staticSeperateLayer = [];
		
		
		if (this.ctrl.customlayerData) {
			this.ctrl.panel.customlayers.forEach(layer => {
				if (this.ctrl.customlayerData[layer.name]) {
					if (this.ctrl.customlayerData[layer.name].data && !layer.usercontrolled && layer.type == "geojson") {
						
						this.staticSeperateLayer.push(L.geoJSON(this.ctrl.customlayerData[layer.name].data, {
							style: function (feature) {
								let result = {};

								if (feature.properties.stroke) {
									result["color"] = feature.properties.stroke;
									result["stroke"] = true;
								}
								if (feature.properties.weight) {
									result["weight"] = feature.properties.weight;
									result["stroke"] = true;
								}
								if (feature.properties.fillcolor) {
									result["fillColor"] = feature.properties.fillcolor;
									result["fill"] = true;
								}
								if (feature.properties.fillopacity) {
									result["fillOpacity"] = feature.properties.fillopacity;
									result["fill"] = true;
								}

								return result;

							}
						}).addTo(this.map));

						this.staticSeperateLayer[this.staticSeperateLayer.length - 1].bringToBack();

					}
					else if (this.ctrl.customlayerData[layer.name].data && layer.type == "geojson") {
						if (this.switchableLayer[layer.name]) {
							this.switchableLayer[layer.name].clearLayers();
							this.switchableLayer[layer.name].addData(this.ctrl.customlayerData[layer.name].data);
							console.log(this.ctrl.customlayerData[layer.name].data)
							this.switchableLayer[layer.name].bringToBack();
						}
						else {
							this.switchableLayer[layer.name] = L.geoJSON(this.ctrl.customlayerData[layer.name].data).addTo(this.map);
							this.switchableLayer[layer.name].bringToBack();
						}

					}
					else if (!layer.usercontrolled && layer.type == "wms") {
						console.log("static wms layers no yet implemented");
					}
					else if (layer.type == "wms") {
						console.log("Dynamic wms layers not yet implemented");
					}
					else if (!layer.usercontrolled && layer.type == "tile") {
						this.staticSeperateLayer.push(L.tileLayer(this.ctrl.customlayerData[layer.name].link, {
							reuseTiles: true,
							detectRetina: true,
							opacity: this.ctrl.customlayerData[layer.name].oppacity,
						}).addTo(this.map));
						this.staticSeperateLayer[this.staticSeperateLayer.length - 1].bringToBack();

					}
					else if (layer.type == "tile") {

						if (!this.switchableLayer[layer.name]) {

							this.switchableLayer[layer.name] = L.tileLayer(this.ctrl.customlayerData[layer.name].link, {
								reuseTiles: true,
								detectRetina: true,
								opacity: this.ctrl.customlayerData[layer.name].oppacity,
							});
							this.switchableLayer[layer.name].bringToBack();
						}
					}

				}
			});

			if (this.backgroundlayer) {
				this.backgroundlayer.bringToBack();
			}

			if (Object.keys(this.switchableLayer).length > 0) {
				this.Controlledlayer = L.control.layers(null, this.switchableLayer, { collapsed: false }).addTo(this.map);
			}
			
        }
    }

	clearStaticLayer() {
        

		this.staticSeperateLayer.forEach(layer => {
			this.map.removeLayer(layer);
		});

        this.Controlledlayer.remove();

    }

    updateControlledLayer() {

        let keysToDelete: string[] = [];

        for (let key in this.switchableLayer) {
			if ((this.ctrl.customlayerData[key]) && (this.ctrl.customlayerData[key].usercontrolled) && (!this.ctrl.customlayerData[key].forceReload)) {
				this.ctrl.customlayerData[key].forceReload = false;
            }
            else {
				keysToDelete.push(key);
				this.ctrl.customlayerData[key].forceReload = false;
            }
        }

		for (let key of keysToDelete) {
			this.map.removeLayer(this.switchableLayer[key]);
            delete this.switchableLayer[key];
        }
       
    }


    updateBaseLayer() {
        const selectedTileServer = tileServers[this.ctrl.tileServer];
		this.backgroundlayer = (<any>window).L.tileLayer(selectedTileServer.url, {
            maxZoom: 18,
            subdomains: selectedTileServer.subdomains,
            reuseTiles: true,
            detectRetina: true,
            attribution: selectedTileServer.attribution,
        }).addTo(this.map);
    }

    createLegend() {
        this.legend = (<any>window).L.control({ position: 'bottomleft' });
        this.legend.onAdd = () => {
            this.legend._div = (<any>window).L.DomUtil.create('div', 'info legend');
            this.legend.update();
            return this.legend._div;
        };

        this.legend.update = () => {
            const thresholds = this.ctrl.data.thresholds;
            let legendHtml = '';
            legendHtml +=
                '<div class="legend-item"><i style="background:' +
                this.ctrl.panel.colors[0] +
                '"></i> ' +
                '&lt; ' +
                thresholds[0] +
                '</div>';
            for (let index = 0; index < thresholds.length; index += 1) {
                legendHtml +=
                    '<div class="legend-item"><i style="background:' +
                    this.ctrl.panel.colors[index + 1] +
                    '"></i> ' +
                    thresholds[index] +
                    (thresholds[index + 1] ? '&ndash;' + thresholds[index + 1] + '</div>' : '+');
            }
            this.legend._div.innerHTML = legendHtml;
        };
        this.legend.addTo(this.map);
    }

    needToRedrawFeatures(data) {

        if (this.circles.length === 0 && data.length > 0 ) {
            return true;
        }

        if (this.circles.length !== data.length) {
            return true;
        }

        if (this.arrows.length !== this.circles.length && this.ctrl.panel.featureType === "phasor-clock") {
            return true;
        }

        const locations = _.map(_.map(this.circles, 'options'), 'location').sort();
        const dataPoints = _.map(data, 'key').sort();
        return !_.isEqual(locations, dataPoints);
    }

    filterEmptyAndZeroValues(data) {
		return _.filter(data, o => {
			return !(this.ctrl.panel.hideEmpty && _.isNil(o.value)) && !(this.ctrl.panel.hideZero && o.value === 0) && !(this.ctrl.panel.hideEmpty && Number.isNaN(o.value));
        });
    }

    drawFeatures() {
        const data = this.filterEmptyAndZeroValues(this.ctrl.data);
        if (this.needToRedrawFeatures(data)) {
            this.clearFeatures();
            this.createFeatures(data);
        } else {
            this.updateFeatures(data);
        }
    }

    createFeatures(data) {
        if (this.ctrl.panel.featureType === "circles") {
            this.createCircles(data);
        }
        else if (this.ctrl.panel.featureType === "phasor-clock") {
            this.createClocks(data);
        }

    }

    clearFeatures() {
        if (this.featuresLayer) {
            this.featuresLayer.clearLayers();

            this.removeFeatures();
            this.circles = [];
            this.arrows = [];
            this.featuresLayer = null;
        }

    }

    updateFeatures(data) {
        if (this.ctrl.panel.featureType === "circles") {
            this.updateCircles(data);
        }
        else if (this.ctrl.panel.featureType === "phasor-clock") {
            this.updateClocks(data);
        }
    }

    // Section to update and create Circles
    updateCircles(data) {
        data.forEach(dataPoint => {
            if (!dataPoint.locationName) {
                return;
            }

            const circle = _.find(this.circles, cir => {
                return cir.options.location === dataPoint.key;
            });


            if (circle) {
                circle.setRadius(this.calcCircleSize(dataPoint.value || 0));
                circle.setStyle({
                    color: this.getColor(dataPoint.value),
                    fillColor: this.getColor(dataPoint.value),
                    fillOpacity: 0.5,
                    location: dataPoint.key,
                });
                circle.closePopup();
                circle.unbindPopup();
                this.createPopup(circle, dataPoint.locationName, dataPoint.valueRounded, dataPoint);
            }
        });
    }

    createCircles(data) {
        const circles: any[] = [];
        data.forEach(dataPoint => {
            if (!dataPoint.locationName) {
                return;
            }
            if ((!dataPoint.locationLatitude) || (!dataPoint.locationLongitude)) {
            }
            else {
                circles.push(this.createCircle(dataPoint));
            }

        });
        this.featuresLayer = this.addFeatures(circles);
        this.circles = circles;
    }

    createCircle(dataPoint) {
        const circle = (<any>window).L.circleMarker([dataPoint.locationLatitude, dataPoint.locationLongitude], {
            radius: this.calcCircleSize(dataPoint.value || 0),
            color: this.getColor(dataPoint.value),
            fillColor: this.getColor(dataPoint.value),
            fillOpacity: 0.5,
            location: dataPoint.key,
        });

        this.createPopup(circle, dataPoint.locationName, dataPoint.valueRounded, dataPoint);
        return circle;
    }

    //End Circle Section

    // Section to update and Create PhasorClocks
    updateClocks(data) {

        this.updateCircles(data)

        data.forEach(dataPoint => {
            if (!dataPoint.locationName) {
                return;
            }

           
            const arrow = _.find(this.arrows, arr => {
                return arr.options.location === dataPoint.key;
            });

            if (arrow) {
                let points = [
                    [dataPoint.locationLatitude, dataPoint.locationLongitude],
                    this.CalculateEndPoint(dataPoint)];
                arrow.setLatLngs(points);
                arrow.setStyle({
                    color: this.getSecondaryColor(dataPoint.value),
                    fillColor: this.getSecondaryColor(dataPoint.value),
                    fillOpacity: 1.0,
                    location: dataPoint.key,
                });
            }
        });
    }

    createClocks(data) {
        const circles: any[] = [];
        const arrows: any[] = [];

        data.forEach(dataPoint => {
            if (!dataPoint.locationName) {
                return;
            }
            if ((!dataPoint.locationLatitude) || (!dataPoint.locationLongitude)) {
            }
            else {
                circles.push(this.createCircle(dataPoint));
                arrows.push(this.createArrow(dataPoint));
            }

        });
        this.featuresLayer = this.addFeatures(circles.concat(arrows));
        this.circles = circles;
        this.arrows = arrows;
    }

    createArrow(dataPoint) {
        const arrow = (<any>window).L.polyline([[dataPoint.locationLatitude, dataPoint.locationLongitude], this.CalculateEndPoint(dataPoint)], {
            color: this.getSecondaryColor(dataPoint.value),
            fillColor: this.getSecondaryColor(dataPoint.value),
            fillOpacity: 1.0,
            location: dataPoint.key,
        });

       
        return arrow;
    }

    CalculateEndPoint(datapoint) {

        var latlng = (<any>window).L.latLng(datapoint.locationLatitude, datapoint.locationLongitude);
        let point1 = this.map.project(latlng, this.map.getZoom())
        let point2 = point1;
        

        let angle = (datapoint.value || 0);
        let length = this.calcCircleSize(datapoint.value);
        point2.x = point1.x + length * Math.cos(angle * Math.PI / 180)
        point2.y = point1.y - length * Math.sin(angle * Math.PI / 180)

        latlng = this.map.unproject(point2, this.map.getZoom());
        return [latlng.lat, latlng.lng];
    }
    //End PhasporClock Section
    calcCircleSize(dataPointValue) {
        const circleMinSize = parseInt(this.ctrl.panel.circleMinSize, 10) || 2;
        const circleMaxSize = parseInt(this.ctrl.panel.circleMaxSize, 10) || 30;

        if (this.ctrl.data.valueRange === 0) {
            return circleMaxSize;
        }

        const dataFactor = (dataPointValue - this.ctrl.data.lowestValue) / this.ctrl.data.valueRange;
        const circleSizeRange = circleMaxSize - circleMinSize;

        return circleSizeRange * dataFactor + circleMinSize;
    }

    createPopup(circle, locationName, value, point) {
        let label;

       
            label = this.ctrl.panel.popupstring;
            label = label.replace(/{value}/gi, value);
            label = label.replace(/{deviceID}/gi, point.deviceId);
            label = label.replace(/{PointTag}/gi, point.PointTag);
            label = label.replace(/{deviceName}/gi, point.deviceName);


        if (this.ctrl.panel.stickyLabels && this.ctrl.panel.constantLabels) {
            circle.bindPopup(label, {
                offset: (<any>window).L.point(0, -2),
                className: 'worldmap-popup',
                closeButton: false,
                autoClose: false,
                closeOnClick: false,
                closeOnEscapeKey: false,
            }).openPopup();
        }
        else {
            circle.bindPopup(label, {
                offset: (<any>window).L.point(0, -2),
                className: 'worldmap-popup',
                closeButton: this.ctrl.panel.stickyLabels,
            });
        }


        circle.on('mouseover', function onMouseOver(evt) {
            const layer = evt.target;
            layer.bringToFront();
            this.openPopup();
        });

        if (!this.ctrl.panel.stickyLabels) {
            circle.on('mouseout', function onMouseOut() {
                circle.closePopup();
            });
        }
    }

    getColor(value) {
        for (let index = this.ctrl.data.thresholds.length; index > 0; index -= 1) {
            if (value >= this.ctrl.data.thresholds[index - 1]) {
                return this.ctrl.panel.colors[index];
            }
        }
        return _.first(this.ctrl.panel.colors);
    }

    getSecondaryColor(value) {
        for (let index = this.ctrl.data.secondarythresholds.length; index > 0; index -= 1) {
            if (value >= this.ctrl.data.secondarythresholds[index - 1]) {
                return this.ctrl.panel.secondarycolors[index];
            }
        }
        return _.first(this.ctrl.panel.secondarycolors);
    }

    resize() {
        this.map.invalidateSize();
    }

    panToMapCenter() {
        this.map.panTo([parseFloat(this.ctrl.panel.mapCenterLatitude), parseFloat(this.ctrl.panel.mapCenterLongitude)]);
        this.ctrl.mapCenterMoved = false;
    }

    removeLegend() {
        this.legend.remove(this.map);
        this.legend = null;
    }

    setMouseWheelZoom() {
        if (!this.ctrl.panel.mouseWheelZoom) {
            this.map.scrollWheelZoom.disable();
        } else {
            this.map.scrollWheelZoom.enable();
        }
    }

    addFeatures(layers) {
        return (<any>window).L.layerGroup(layers).addTo(this.map);
    }

    removeFeatures() {
        this.map.removeLayer(this.featuresLayer);
        this.featuresLayer = null;
        
    }

    setZoom(zoomFactor) {
        this.map.setZoom(parseFloat(zoomFactor));
    }

    remove() {
        this.circles = [];
        this.arrows = [];

        if (this.featuresLayer) {
            this.removeFeatures();
        }
        if (this.legend) {
            this.removeLegend();

            
            this.map.remove();
        } 
    }
}
