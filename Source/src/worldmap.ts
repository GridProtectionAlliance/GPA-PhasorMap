import * as _ from 'lodash';
import * as L from './libs/leaflet';
import WorldmapCtrl from './worldmap_ctrl';

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
        subdomains: 'abcd',
    }
}

export default class WorldMap {
    ctrl: WorldmapCtrl;
    mapContainer: any;
    circles: any[];
    map: any;
    legend: any;
    circlesLayer: any;
    Staticlayer: any;
    Controlledlayer: any;
    switchableLayer: any;

    constructor(ctrl, mapContainer) {
        this.ctrl = ctrl;
        this.mapContainer = mapContainer;
        this.circles = [];
        this.switchableLayer = {};
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
        (<any>window).L.tileLayer(selectedTileServer.url, {
            maxZoom: 18,
            subdomains: selectedTileServer.subdomains,
            reuseTiles: true,
            detectRetina: true,
            attribution: selectedTileServer.attribution,
        }).addTo(this.map);

        this.Staticlayer = L.geoJSON().addTo(this.map);
        this.Controlledlayer = L.control.layers(null).addTo(this.map);
    }

    updateStaticLayer() {
        this.clearStaticLayer();
        let features: any[] = [];

        if (this.ctrl.customlayerData) {
            this.ctrl.panel.customlayers.forEach(layer => {
                if (this.ctrl.customlayerData[layer.name]) {
                    if (this.ctrl.customlayerData[layer.name].data && !layer.usercontrolled) {
                        features.push(this.ctrl.customlayerData[layer.name].data);

                    }
                    else if (this.ctrl.customlayerData[layer.name].data) {
                        if (this.switchableLayer[layer.name]) {
                            this.switchableLayer[layer.name].clearLayers();
                            this.switchableLayer[layer.name].addData(this.ctrl.customlayerData[layer.name].data);
                        }
                        else {
                            this.switchableLayer[layer.name] = L.geoJSON(this.ctrl.customlayerData[layer.name].data).addTo(this.map);
                        }

                    }
                }
            });

            this.Controlledlayer = L.control.layers(null, this.switchableLayer).addTo(this.map);
            this.Staticlayer.addData(features);
        }
    }

    clearStaticLayer() {
        this.Staticlayer.clearLayers();
        this.Staticlayer.remove();
        this.Staticlayer = L.geoJSON().addTo(this.map);

        this.Controlledlayer.remove();

    }


    updateBaseLayer() {
        const selectedTileServer = tileServers[this.ctrl.tileServer];
        (<any>window).L.tileLayer(selectedTileServer.url, {
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

    needToRedrawCircles(data) {
        if (this.circles.length === 0 && data.length > 0) {
            return true;
        }

        if (this.circles.length !== data.length) {
            return true;
        }

        const locations = _.map(_.map(this.circles, 'options'), 'location').sort();
        const dataPoints = _.map(data, 'key').sort();
        return !_.isEqual(locations, dataPoints);
    }

    filterEmptyAndZeroValues(data) {
        return _.filter(data, o => {
            return !(this.ctrl.panel.hideEmpty && _.isNil(o.value)) && !(this.ctrl.panel.hideZero && o.value === 0);
        });
    }

    clearCircles() {
        if (this.circlesLayer) {
            this.circlesLayer.clearLayers();
            
            this.removeCircles();
            this.circles = [];
            this.circlesLayer = null;
        }
    }

    drawCircles() {
        const data = this.filterEmptyAndZeroValues(this.ctrl.data);
        if (this.needToRedrawCircles(data)) {
            this.clearCircles();
            this.createCircles(data);
        } else {
            this.updateCircles(data);
        }
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
        this.circlesLayer = this.addCircles(circles);
        this.circles = circles;
    }

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
        const unit = value && value === 1 ? this.ctrl.panel.unitSingular : this.ctrl.panel.unitPlural;
        let label;

        if (this.ctrl.panel.locationData === "OpenHistorian") {
            //label = ("<a href='../ParentStatus.cshtml?DeviceID=" + deviceId + "'>" + locationName + "</a>").trim();
            label = this.ctrl.panel.popupstring;
            label = label.replace("{value}", value);
            label = label.replace("{deviceID}", point.deviceId);
            label = label.replace("{PointTag}", point.PointTag);
            label = label.replace("{deviceName}", point.deviceName);

        }
        else {
            label = (locationName + ': ' + value + ' ' + (unit || '')).trim();
        }


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

    addCircles(circles) {
        return (<any>window).L.layerGroup(circles).addTo(this.map);
    }

    removeCircles() {
        this.map.removeLayer(this.circlesLayer);
        this.circlesLayer = null;
        
    }

    setZoom(zoomFactor) {
        this.map.setZoom(parseFloat(zoomFactor));
    }

    remove() {
        this.circles = [];
        if (this.circlesLayer) {
            this.removeCircles();
        }
        if (this.legend) {
            this.removeLegend();

            
            this.map.remove();
        } 
    }
}
